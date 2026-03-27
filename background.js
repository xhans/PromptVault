// PromptVault Background Service Worker

// 安装时初始化
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('PromptVault 已安装');
    
    // 创建右键菜单
    chrome.contextMenus.create({
      id: 'saveSelection',
      title: '保存到 PromptVault',
      contexts: ['selection']
    });
    
    chrome.contextMenus.create({
      id: 'savePage',
      title: '保存页面信息到 PromptVault',
      contexts: ['page']
    });
  }
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'saveSelection') {
    // 保存选中的文本
    const data = {
      type: 'selection',
      content: info.selectionText,
      sourceUrl: tab.url,
      sourceTitle: tab.title
    };
    saveToPromptVault(data);
  } else if (info.menuItemId === 'savePage') {
    // 保存页面信息
    const data = {
      type: 'page',
      sourceUrl: tab.url,
      sourceTitle: tab.title
    };
    saveToPromptVault(data);
  }
});

// 处理来自内容脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureSelection') {
    // 从当前标签页获取选中的文本
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: getSelectedText
          });
          
          const selectedText = results[0]?.result || '';
          
          const data = {
            type: 'selection',
            content: selectedText,
            sourceUrl: tabs[0].url,
            sourceTitle: tabs[0].title
          };
          
          // 存储数据
          await chrome.storage.local.set({ 'pendingCapture': data });
          
          // 打开侧边栏
          chrome.sidePanel.open({ windowId: tabs[0].windowId });
          
          sendResponse({ success: true, data });
        } catch (error) {
          console.error('捕获失败:', error);
          sendResponse({ success: false, error: error.message });
        }
      }
    });
    return true; // 保持消息通道开放
  }
  
  if (request.action === 'getPendingCapture') {
    // 获取待捕获的数据
    chrome.storage.local.get('pendingCapture', (result) => {
      sendResponse(result.pendingCapture || null);
      // 获取后清除
      chrome.storage.local.remove('pendingCapture');
    });
    return true;
  }
  
  if (request.action === 'savePrompt') {
    // 保存 Prompt 到 IndexedDB（通过前端处理）
    sendResponse({ success: true });
  }
});

// 在页面中执行的函数
function getSelectedText() {
  return window.getSelection().toString();
}

// 保存到 PromptVault
async function saveToPromptVault(data) {
  await chrome.storage.local.set({ 'pendingCapture': data });
  
  // 获取当前窗口并打开侧边栏
  const windows = await chrome.windows.getCurrent();
  chrome.sidePanel.open({ windowId: windows.id });
}

// 监听扩展图标点击 - 切换侧边栏
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});
