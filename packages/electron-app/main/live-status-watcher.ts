// ============================================================
// Live Status Watcher - 下播自动断开检测
//
// 职责：
//   1) 直播间连接期间按固定间隔查询 B站开播状态
//   2) 仅在「已确认直播中 → 连续确认非直播」后触发一次下播回调
//   3) 查询失败 / 功能关闭时不做任何判定，避免误断开
// ============================================================

import { logger } from "./logger";

/** B站 live_status 取值：0=未开播 1=直播中 2=轮播 */
const LIVE_STATUS_OFFLINE = 0;
const LIVE_STATUS_LIVE = 1;
const LIVE_STATUS_REPLAY = 2;

/** 默认轮询间隔（ms）：20s，兼顾及时性与接口压力 */
const DEFAULT_INTERVAL_MS = 20_000;
/** 默认连续确认次数：避免接口抖动导致误判 */
const DEFAULT_CONFIRMATIONS = 2;

export interface LiveStatusWatcherDeps {
  /** 查询直播间开播状态；不可用/失败时返回 null（视为未知，不判定下播） */
  fetchLiveStatus: (roomId: number) => Promise<number | null>;
  /** 每次轮询时读取；返回 false 时跳过本次查询（仍保留轮询，便于配置即时生效） */
  isEnabled: () => boolean;
  /** 确认下播后触发（同一房间最多一次） */
  onLiveEnded: (roomId: number) => void;
  /** 轮询间隔（ms） */
  intervalMs?: number;
  /** 连续非直播确认次数 */
  confirmations?: number;
}

/**
 * 下播检测器。
 *
 * 设计要点：
 * - 启动后立即查询一次，之后按固定间隔轮询；避免首查白等一个间隔，
 *   也让「连接后很快下播」的场景能尽早进入“已观察到直播中”状态。
 * - 只在「本次连接期间至少观察到一次直播中」之后才累计非直播次数，
 *   避免连接初期接口缓存/抖动返回的 0 状态被误判成下播。
 * - 每次轮询都重新读取配置开关，用户启停开关后无需重新连接即可生效。
 * - 所有定时器 unref，避免阻止进程退出。
 */
export class LiveStatusWatcher {
  private readonly fetchLiveStatus: LiveStatusWatcherDeps["fetchLiveStatus"];
  private readonly isEnabled: () => boolean;
  private readonly onLiveEnded: (roomId: number) => void;
  private readonly intervalMs: number;
  private readonly confirmations: number;

  private timer: ReturnType<typeof setTimeout> | null = null;
  private roomId = 0;
  /** 轮询代次：stop/start 时自增，用于丢弃已过期的异步查询结果 */
  private generation = 0;
  private nonLiveHits = 0;
  private observedLive = false;
  private ended = false;

  constructor(deps: LiveStatusWatcherDeps) {
    this.fetchLiveStatus = deps.fetchLiveStatus;
    this.isEnabled = deps.isEnabled;
    this.onLiveEnded = deps.onLiveEnded;
    this.intervalMs = Math.max(5_000, Number(deps.intervalMs) || DEFAULT_INTERVAL_MS);
    this.confirmations = Math.max(1, Math.trunc(Number(deps.confirmations) || DEFAULT_CONFIRMATIONS));
  }

  /** 开始监听指定房间的下播状态（重复调用会重置状态） */
  start(roomId: number): void {
    this.stop();
    const normalized = Math.trunc(Number(roomId) || 0);
    if (normalized <= 0) return;
    this.roomId = normalized;
    // 立即查询一次：省掉首查的等待间隔；后续节拍仍由 tick 末尾的 schedule 维持。
    void this.tick();
  }

  /** 停止轮询并清空状态 */
  stop(): void {
    this.generation += 1;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.roomId = 0;
    this.nonLiveHits = 0;
    this.observedLive = false;
    this.ended = false;
  }

  /** 当前是否有房间处于检测状态 */
  isRunning(): boolean {
    return this.roomId > 0 && !this.ended;
  }

  private schedule(): void {
    if (this.timer || this.ended || this.roomId <= 0) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.tick();
    }, this.intervalMs);
    this.timer.unref?.();
  }

  private async tick(): Promise<void> {
    const generation = this.generation;
    const roomId = this.roomId;
    if (roomId <= 0 || this.ended) return;

    // 关闭开关时跳过查询，但保留轮询，便于用户随时打开开关
    let enabled = false;
    try {
      enabled = this.isEnabled();
    } catch (e) {
      enabled = false;
      logger.warn("[LiveStatus] read enabled state failed", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
    if (!enabled) {
      this.schedule();
      return;
    }

    let status: number | null = null;
    try {
      status = await this.fetchLiveStatus(roomId);
    } catch (e) {
      status = null;
      logger.warn("[LiveStatus] fetch failed", {
        roomId,
        error: e instanceof Error ? e.message : String(e),
      });
    }

    // 查询期间被停止/重启：丢弃本次结果
    if (generation !== this.generation || this.roomId !== roomId || this.ended) return;

    if (status === LIVE_STATUS_LIVE) {
      this.observedLive = true;
      this.nonLiveHits = 0;
      this.schedule();
      return;
    }

    if (this.observedLive && (status === LIVE_STATUS_OFFLINE || status === LIVE_STATUS_REPLAY)) {
      this.nonLiveHits += 1;
      logger.log("[LiveStatus] non-live status detected", {
        roomId,
        status,
        hits: this.nonLiveHits,
        confirmations: this.confirmations,
      });

      if (this.nonLiveHits >= this.confirmations) {
        this.ended = true;
        logger.log("[LiveStatus] live ended confirmed", { roomId, status });
        this.onLiveEnded(roomId);
        return;
      }

      this.schedule();
      return;
    }

    // 查询失败或状态未知：不累计次数，继续轮询
    this.schedule();
  }
}

export default LiveStatusWatcher;
