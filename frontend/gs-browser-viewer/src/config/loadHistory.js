// src/config/loadHistory.js
// 负责获取并过滤静态历史训练任务数据

/**
 * 获取所有场景的历史任务列表
 * @returns {Promise<Array>} 历史任务数组
 */
export async function fetchHistory() {
  const response = await fetch("/data/history.json");
  if (!response.ok) throw new Error("Failed to load history.json");
  return response.json();
}

/**
 * 获取指定场景的历史任务，按时间倒序排列（最新任务在最前）
 * @param {string} sceneId 场景 ID
 * @returns {Promise<Array>} 该场景的历史任务数组
 */
export async function getHistoryByScene(sceneId) {
  const all = await fetchHistory();
  return all
    .filter((task) => task.sceneId === sceneId)
    .sort((a, b) => {
      // 未开始的任务（queued）排在最前面，已完成的按时间倒序
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return -1;
      if (!b.startTime) return 1;
      return new Date(b.startTime) - new Date(a.startTime);
    });
}
