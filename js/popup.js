// PromptVault Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  const captureBtn = document.getElementById('captureBtn');
  const openVaultBtn = document.getElementById('openVaultBtn');
  const totalCountEl = document.getElementById('totalCount');
  const favCountEl = document.getElementById('favCount');
  
  // 加载统计信息
  loadStats();
  
  // 捕获选中内容
  captureBtn.addEventListener('click', async () => {
    try {
      captureBtn.disabled = true;
      captureBtn.innerHTML = '<span>⏳</span> 捕获中...';
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        showError('无法访问当前页面');
        return;
      }
      
      // 获取选中的文本
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString().trim()
      });
      
      const selectedText = results[0]?.result || '';
      
      if (!selectedText) {
        showError('请先选中要保存的文本');
        return;
      }
      
      // 存储数据并打开侧边栏
      const data = {
        type: 'selection',
        content: selectedText,
        sourceUrl: tab.url,
        sourceTitle: tab.title,
        timestamp: Date.now()
      };
      
      await chrome.storage.local.set({ 'pendingCapture': data });
      await chrome.sidePanel.open({ windowId: tab.windowId });
      
      // 关闭 popup
      window.close();
      
    } catch (error) {
      console.error('捕获失败:', error);
      showError('捕获失败: ' + error.message);
    }
  });
  
  // 打开收藏库
  openVaultBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.sidePanel.open({ windowId: tab.windowId });
      window.close();
    } catch (error) {
      console.error('打开失败:', error);
    }
  });
  
  // 加载统计数据
  async function loadStats() {
    try {
      // 从 IndexedDB 获取数据需要通过页面进行
      // 这里使用存储的统计信息
      const result = await chrome.storage.local.get(['promptStats']);
      const stats = result.promptStats || { total: 0, favorites: 0 };
      
      totalCountEl.textContent = stats.total || 0;
      favCountEl.textContent = stats.favorites || 0;
    } catch (error) {
      totalCountEl.textContent = '0';
      favCountEl.textContent = '0';
    }
  }
  
  function showError(message) {
    captureBtn.innerHTML = `<span>❌</span> ${message}`;
    captureBtn.style.background = '#ff4757';
    captureBtn.style.color = '#fff';
    
    setTimeout(() => {
      captureBtn.disabled = false;
      captureBtn.innerHTML = '<span>📋</span> 捕获选中内容';
      captureBtn.style.background = '';
      captureBtn.style.color = '';
    }, 2000);
  }
});
