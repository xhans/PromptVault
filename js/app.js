// PromptVault Main Application

// 扩展模式检测
const isExtensionMode = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

// 数据库和应用逻辑
class PromptVault {
    constructor() {
        this.db = null;
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.categories = {
            general: { name: '通用', icon: 'message-square' },
            writing: { name: '写作', icon: 'pen-tool' },
            coding: { name: '编程', icon: 'code' },
            image: { name: '图像', icon: 'image' },
            analysis: { name: '分析', icon: 'bar-chart-2' },
            other: { name: '其他', icon: 'more-horizontal' }
        };
        this.currentView = 'card'; // 'card' 或 'list'
        this.sidebarCollapsed = false;
        this.init();
    }

    async init() {
        try {
            // 初始化 Dexie 数据库
            this.db = new Dexie('PromptVaultDB');
            this.db.version(1).stores({
                prompts: '++id, title, content, category, tags, sourceUrl, sourceTitle, isFavorite, createdAt, updatedAt'
            });
            
            await this.db.open();
            
            // 初始化主题
            this.initTheme();
            
            // 初始化侧边栏状态
            this.initSidebar();
            
            // 初始化视图模式
            this.initView();
            
            this.renderCategoryNav();
            this.loadPrompts();
            this.setupEventListeners();
            
            // 扩展模式下检查待捕获数据
            if (isExtensionMode) {
                this.checkPendingCapture();
            }
        } catch (error) {
            console.error('Database initialization failed:', error);
            this.showToast('数据库初始化失败，请检查浏览器权限', 'error');
        }
    }
    
    // 主题管理
    initTheme() {
        // 从 localStorage 读取保存的主题
        const savedTheme = localStorage.getItem('promptvault-theme') || 'dark';
        this.setTheme(savedTheme);
    }
    
    setTheme(theme) {
        this.currentTheme = theme;
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        localStorage.setItem('promptvault-theme', theme);
    }
    
    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        this.showToast(newTheme === 'light' ? '已切换到亮色主题' : '已切换到暗色主题', 'info');
    }
    
    // 侧边栏管理
    initSidebar() {
        const savedState = localStorage.getItem('promptvault-sidebar');
        // 默认收起侧边栏，除非用户之前明确展开过
        this.sidebarCollapsed = savedState !== 'expanded';
        this.applySidebarState();
    }
    
    toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
        this.applySidebarState();
        localStorage.setItem('promptvault-sidebar', this.sidebarCollapsed ? 'collapsed' : 'expanded');
    }
    
    applySidebarState() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            if (this.sidebarCollapsed) {
                sidebar.classList.add('collapsed');
            } else {
                sidebar.classList.remove('collapsed');
            }
        }
    }
    
    // 视图模式管理
    initView() {
        const savedView = localStorage.getItem('promptvault-view') || 'card';
        this.setView(savedView);
    }
    
    setView(view) {
        this.currentView = view;
        const contentArea = document.getElementById('content-area');
        const grid = document.getElementById('prompt-grid');
        
        // 更新视图按钮状态
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === view) {
                btn.classList.add('active');
            }
        });
        
        // 应用视图样式
        if (contentArea) {
            if (view === 'list') {
                contentArea.classList.add('list-view');
                grid.classList.remove('grid-cols-1', 'md:grid-cols-2', 'xl:grid-cols-3');
                grid.classList.add('flex', 'flex-col');
            } else {
                contentArea.classList.remove('list-view');
                grid.classList.remove('flex', 'flex-col');
                grid.classList.add('grid', 'grid-cols-1', 'md:grid-cols-2', 'xl:grid-cols-3');
            }
        }
        
        // 重新渲染以应用新样式
        this.loadPrompts();
        localStorage.setItem('promptvault-view', view);
    }

    setupEventListeners() {
        // 实时字符计数
        const promptContent = document.getElementById('prompt-content');
        if (promptContent) {
            promptContent.addEventListener('input', (e) => {
                document.getElementById('char-count').textContent = `${e.target.value.length} 字符`;
            });
        }
        
        // 搜索输入
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }
        
        // 表单提交
        const promptForm = document.getElementById('prompt-form');
        if (promptForm) {
            promptForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.savePrompt();
            });
        }
        
        // 键盘快捷键支持
        document.addEventListener('keydown', (e) => {
            const isMeta = e.ctrlKey || e.metaKey;
            
            // 快速搜索 Ctrl/Cmd + K
            if (isMeta && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }
            
            // 新建 Prompt Ctrl/Cmd + N
            if (isMeta && e.key === 'n') {
                e.preventDefault();
                this.openModal();
            }
            
            // 导出数据 Ctrl/Cmd + E
            if (isMeta && e.key === 'e') {
                e.preventDefault();
                this.exportData();
            }
            
            // 关闭弹窗 ESC
            if (e.key === 'Escape') {
                const modal = document.getElementById('modal');
                if (modal && !modal.classList.contains('hidden')) {
                    this.closeModal();
                }
            }
            
            // 切换主题 Ctrl/Cmd + T
            if (isMeta && e.key === 't') {
                e.preventDefault();
                this.toggleTheme();
            }
            
            // 切换视图 Ctrl/Cmd + 1/2
            if (isMeta && (e.key === '1' || e.key === '2')) {
                e.preventDefault();
                this.setView(e.key === '1' ? 'card' : 'list');
            }
            
            // 切换侧边栏 Ctrl/Cmd + B
            if (isMeta && e.key === 'b') {
                e.preventDefault();
                this.toggleSidebar();
            }
        });
        
        // 导航按钮事件委托
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            
            const action = target.dataset.action;
            const id = target.dataset.id;
            
            // 快速收藏：双击星标
            if (action === 'quickFavorite' || (action === 'toggleFavorite' && e.detail === 2)) {
                e.preventDefault();
                e.stopPropagation();
                this.toggleFavorite(parseInt(id), true);
                return;
            }
            
            switch (action) {
                case 'setFilter':
                    this.setFilter(target.dataset.filter);
                    break;
                case 'openModal':
                    this.openModal(id ? parseInt(id) : null);
                    break;
                case 'closeModal':
                    this.closeModal();
                    break;
                case 'toggleFavorite':
                    this.toggleFavorite(parseInt(id));
                    break;
                case 'editPrompt':
                    this.editPrompt(parseInt(id));
                    break;
                case 'deletePrompt':
                    this.deletePrompt(parseInt(id));
                    break;
                case 'copyToClipboard':
                    this.copyToClipboard(parseInt(id));
                    break;
                case 'exportData':
                    this.exportData();
                    break;
                case 'optimizePrompt':
                    this.optimizePrompt();
                    break;
                case 'previewPrompt':
                    this.previewPrompt();
                    break;
                case 'captureFromPage':
                    this.captureFromPage();
                    break;
                case 'dismissHint':
                    document.getElementById('extension-hint').classList.add('hidden');
                    break;
                case 'toggleTheme':
                    this.toggleTheme();
                    break;
                case 'toggleSidebar':
                    this.toggleSidebar();
                    break;
                case 'setView':
                    this.setView(target.dataset.view);
                    break;
            }
        });
        
        // 文件导入
        const fileInput = document.getElementById('import-file');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.importData(e.target);
            });
        }
        
        // 列表视图内容预览
        this.setupContentPreview();
    }
        
    renderCategoryNav() {
        const container = document.getElementById('category-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        Object.entries(this.categories).forEach(([key, value]) => {
            const btn = document.createElement('button');
            btn.className = 'w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition-all hover:bg-white/5 text-gray-400 text-sm';
            btn.dataset.action = 'setFilter';
            btn.dataset.filter = key;
            btn.id = `nav-${key}`;
            btn.innerHTML = `
                <i data-lucide="${value.icon}" class="w-4 h-4"></i>
                <span>${value.name}</span>
            `;
            container.appendChild(btn);
        });
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    async loadPrompts() {
        let collection = this.db.prompts.orderBy('updatedAt').reverse();
        
        // 应用过滤器
        if (this.currentFilter === 'favorites') {
            collection = collection.filter(p => p.isFavorite);
        } else if (this.currentFilter !== 'all') {
            collection = collection.filter(p => p.category === this.currentFilter);
        }
        
        // 应用搜索
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            collection = collection.filter(p => 
                p.title.toLowerCase().includes(query) || 
                p.content.toLowerCase().includes(query) ||
                (p.tags && p.tags.toLowerCase().includes(query))
            );
        }
        
        const prompts = await collection.toArray();
        this.renderGrid(prompts);
        this.updateCounts();
    }

    renderGrid(prompts) {
        const grid = document.getElementById('prompt-grid');
        const emptyState = document.getElementById('empty-state');
        
        if (!grid || !emptyState) return;
        
        if (prompts.length === 0) {
            grid.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        grid.innerHTML = prompts.map(prompt => this.createPromptCard(prompt)).join('');
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    createPromptCard(prompt) {
        const category = this.categories[prompt.category] || this.categories.other;
        const tags = prompt.tags ? prompt.tags.split(',').map(t => t.trim()).filter(t => t) : [];
        const date = new Date(prompt.updatedAt).toLocaleDateString('zh-CN');
        
        // 列表视图简化版
        if (this.currentView === 'list') {
            const contentPreview = prompt.content.substring(0, 200).replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `
                <div class="glass-card rounded-lg p-3 group relative animate-fade-in flex items-center gap-3" data-id="${prompt.id}">
                    <div class="flex-shrink-0 w-2 h-2 rounded-full" style="background: var(--accent);"></div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <h3 class="font-semibold truncate text-sm cursor-help preview-trigger" 
                                style="color: var(--text-primary);"
                                data-preview="${contentPreview}${prompt.content.length > 200 ? '...' : ''}">${prompt.title}</h3>
                            <span class="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style="background: var(--border); color: var(--text-muted);">${category.name}</span>
                            ${prompt.isFavorite ? '<i data-lucide="star" class="w-3 h-3 text-yellow-500 fill-current flex-shrink-0"></i>' : ''}
                        </div>
                        <div class="flex items-center gap-2 text-xs mt-0.5" style="color: var(--text-muted);">
                            <span class="truncate">${tags.slice(0, 3).join(', ')}</span>
                            ${tags.length > 3 ? `<span class="flex-shrink-0">+${tags.length - 3}</span>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center gap-0.5 flex-shrink-0">
                        <button data-action="toggleFavorite" data-id="${prompt.id}" class="p-1.5 rounded-lg transition-colors" style="color: var(--text-muted);" onmouseover="this.style.background='var(--border)'" onmouseout="this.style.background='transparent'" title="双击快速收藏">
                            <i data-lucide="star" class="w-4 h-4 ${prompt.isFavorite ? 'text-yellow-500 fill-current' : ''}"></i>
                        </button>
                        <button data-action="editPrompt" data-id="${prompt.id}" class="p-1.5 rounded-lg transition-colors" style="color: var(--text-muted);" onmouseover="this.style.background='var(--border)'" onmouseout="this.style.background='transparent'">
                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                        </button>
                        <button data-action="copyToClipboard" data-id="${prompt.id}" class="p-1.5 rounded-lg transition-colors" style="color: var(--text-muted);" onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--text-muted)'">
                            <i data-lucide="copy" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            `;
        }
        
        // 卡片视图详细版
        return `
            <div class="glass-card rounded-xl p-5 group relative animate-fade-in" data-id="${prompt.id}">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full animate-pulse-slow" style="background: var(--accent);"></span>
                        <span class="text-xs font-medium uppercase tracking-wider" style="color: var(--text-muted);">${category.name}</span>
                    </div>
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button data-action="toggleFavorite" data-id="${prompt.id}" class="p-1.5 rounded-lg transition-colors ${prompt.isFavorite ? 'text-yellow-500' : ''}" style="color: var(--text-muted);" onmouseover="this.style.background='var(--border)'" onmouseout="this.style.background='transparent'">
                            <i data-lucide="star" class="w-4 h-4 ${prompt.isFavorite ? 'fill-current' : ''}"></i>
                        </button>
                        <button data-action="editPrompt" data-id="${prompt.id}" class="p-1.5 rounded-lg transition-colors" style="color: var(--text-muted);" onmouseover="this.style.background='var(--border)'" onmouseout="this.style.background='transparent'">
                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                        </button>
                        <button data-action="deletePrompt" data-id="${prompt.id}" class="p-1.5 rounded-lg transition-colors hover:text-red-400" style="color: var(--text-muted);" onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'" onmouseout="this.style.background='transparent'">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
                
                <h3 class="font-semibold mb-2 truncate text-lg" style="color: var(--text-primary);">${prompt.title}</h3>
                <p class="text-sm font-mono leading-relaxed card-content mb-4" style="color: var(--text-secondary); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${prompt.content}</p>
                
                <div class="flex items-center justify-between pt-3 card-footer" style="border-top: 1px solid var(--border);">
                    <div class="flex gap-1.5 flex-wrap">
                        ${tags.slice(0, 3).map(tag => `
                            <span class="tag-badge text-[10px] px-2 py-0.5 rounded-full">${tag}</span>
                        `).join('')}
                        ${tags.length > 3 ? `<span class="text-[10px] px-1" style="color: var(--text-muted);">+${tags.length - 3}</span>` : ''}
                    </div>
                    <button data-action="copyToClipboard" data-id="${prompt.id}" class="flex items-center gap-1.5 text-xs transition-colors" style="color: var(--text-muted);" onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--text-muted)'">
                        <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                        <span>复制</span>
                    </button>
                </div>
                
                ${prompt.sourceUrl ? `
                    <div class="mt-3 pt-2 truncate text-[10px]" style="border-top: 1px solid var(--border); color: var(--text-muted);">
                        来源: <a href="${prompt.sourceUrl}" target="_blank" class="truncate hover:underline" style="color: var(--accent);">${prompt.sourceTitle || prompt.sourceUrl}</a>
                    </div>
                ` : ''}
            </div>
        `;
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // 更新 UI
        document.querySelectorAll('.nav-item, #nav-all, #nav-favorites').forEach(btn => {
            btn.classList.remove('category-active');
            btn.classList.add('text-gray-400');
        });
        
        const activeBtn = document.getElementById(`nav-${filter}`);
        if (activeBtn) {
            activeBtn.classList.add('category-active');
            activeBtn.classList.remove('text-gray-400');
        }
        
        this.loadPrompts();
    }

    handleSearch(query) {
        this.searchQuery = query;
        this.loadPrompts();
    }

    async updateCounts() {
        const total = await this.db.prompts.count();
        const countEl = document.getElementById('count-all');
        if (countEl) countEl.textContent = total;
        
        // 更新扩展统计信息
        if (isExtensionMode) {
            const favorites = await this.db.prompts.filter(p => p.isFavorite).count();
            chrome.storage.local.set({
                'promptStats': { total, favorites }
            });
        }
    }

    openModal(id = null) {
        const modal = document.getElementById('modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('prompt-form');
        const sourceInfo = document.getElementById('source-info');
        
        if (!modal) return;
        
        // 清除之前的数据
        form?.reset();
        document.getElementById('prompt-id').value = '';
        document.getElementById('char-count').textContent = '0 字符';
        if (sourceInfo) {
            sourceInfo.classList.add('hidden');
            sourceInfo.textContent = '';
        }
        delete this.pendingSourceUrl;
        delete this.pendingSourceTitle;
        
        if (id) {
            title.textContent = '编辑 Prompt';
            this.db.prompts.get(id).then(prompt => {
                document.getElementById('prompt-id').value = prompt.id;
                document.getElementById('prompt-title').value = prompt.title;
                document.getElementById('prompt-content').value = prompt.content;
                document.getElementById('prompt-category').value = prompt.category;
                document.getElementById('prompt-tags').value = prompt.tags || '';
                document.getElementById('char-count').textContent = `${prompt.content.length} 字符`;
            });
        } else {
            title.textContent = '新建 Prompt';
        }
        
        modal.classList.remove('hidden');
    }

    closeModal() {
        const modal = document.getElementById('modal');
        if (modal) modal.classList.add('hidden');
        
        // 清除来源信息
        const sourceInfo = document.getElementById('source-info');
        if (sourceInfo) {
            sourceInfo.classList.add('hidden');
            sourceInfo.textContent = '';
        }
        delete this.pendingSourceUrl;
        delete this.pendingSourceTitle;
    }

    async savePrompt() {
        const id = document.getElementById('prompt-id').value;
        const data = {
            title: document.getElementById('prompt-title').value,
            content: document.getElementById('prompt-content').value,
            category: document.getElementById('prompt-category').value,
            tags: document.getElementById('prompt-tags').value,
            updatedAt: new Date()
        };
        
        // 添加来源信息（如果有）
        if (this.pendingSourceUrl) {
            data.sourceUrl = this.pendingSourceUrl;
            data.sourceTitle = this.pendingSourceTitle || '';
            delete this.pendingSourceUrl;
            delete this.pendingSourceTitle;
        }
        
        try {
            if (id) {
                await this.db.prompts.update(parseInt(id), data);
                this.showToast('已更新', 'success');
            } else {
                data.createdAt = new Date();
                data.isFavorite = false;
                await this.db.prompts.add(data);
                this.showToast('已保存到本地', 'success');
            }
            this.closeModal();
            this.loadPrompts();
        } catch (error) {
            this.showToast('保存失败', 'error');
            console.error(error);
        }
    }

    async editPrompt(id) {
        this.openModal(id);
    }

    async deletePrompt(id) {
        if (!confirm('确定要删除这个 Prompt 吗？此操作不可恢复。')) return;
        
        try {
            await this.db.prompts.delete(id);
            this.showToast('已删除', 'success');
            this.loadPrompts();
        } catch (error) {
            this.showToast('删除失败', 'error');
        }
    }

    async toggleFavorite(id, showAnimation = false) {
        const prompt = await this.db.prompts.get(id);
        const newState = !prompt.isFavorite;
        await this.db.prompts.update(id, { isFavorite: newState });
        
        // 显示收藏动画
        if (showAnimation) {
            const btn = document.querySelector(`[data-id="${id}"] [data-action="toggleFavorite"]`);
            if (btn) {
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.classList.add('favorite-anim');
                    setTimeout(() => icon.classList.remove('favorite-anim'), 300);
                }
            }
            this.showToast(newState ? '已添加到收藏夹' : '已取消收藏', 'success');
        }
        
        this.loadPrompts();
    }

    async copyToClipboard(id) {
        const prompt = await this.db.prompts.get(parseInt(id));
        if (prompt) {
            try {
                await navigator.clipboard.writeText(prompt.content);
                this.showToast('已复制到剪贴板', 'success');
            } catch (err) {
                // 降级方案
                const textarea = document.createElement('textarea');
                textarea.value = prompt.content;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                this.showToast('已复制到剪贴板', 'success');
            }
        }
    }

    optimizePrompt() {
        const contentEl = document.getElementById('prompt-content');
        const content = contentEl.value;
        
        if (!content.trim()) {
            this.showToast('请先输入内容', 'error');
            return;
        }
        
        // 简单的格式化优化模拟
        let optimized = content
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        
        if (!optimized.startsWith('#') && !optimized.startsWith('【')) {
            optimized = `【角色设定】\n你是一位专业的助手。\n\n【任务】\n${optimized}\n\n【要求】\n- 请详细回答\n- 保持专业语气`;
        }
        
        contentEl.value = optimized;
        document.getElementById('char-count').textContent = `${optimized.length} 字符`;
        this.showToast('已优化格式', 'success');
    }
    
    // 列表视图内容预览
    setupContentPreview() {
        // 创建预览元素
        let previewEl = document.getElementById('content-preview');
        if (!previewEl) {
            previewEl = document.createElement('div');
            previewEl.id = 'content-preview';
            previewEl.className = 'content-preview';
            document.body.appendChild(previewEl);
        }
        
        // 使用事件委托处理鼠标悬停
        document.addEventListener('mouseover', (e) => {
            const trigger = e.target.closest('.preview-trigger');
            if (!trigger) return;
            
            const preview = trigger.dataset.preview;
            if (!preview) return;
            
            previewEl.textContent = preview;
            previewEl.classList.add('show');
            
            // 定位预览元素
            const rect = trigger.getBoundingClientRect();
            previewEl.style.left = `${rect.right + 10}px`;
            previewEl.style.top = `${rect.top}px`;
            
            // 确保不超出屏幕
            const previewRect = previewEl.getBoundingClientRect();
            if (previewRect.right > window.innerWidth) {
                previewEl.style.left = `${rect.left - previewRect.width - 10}px`;
            }
            if (previewRect.bottom > window.innerHeight) {
                previewEl.style.top = `${window.innerHeight - previewRect.height - 10}px`;
            }
        });
        
        document.addEventListener('mouseout', (e) => {
            const trigger = e.target.closest('.preview-trigger');
            if (!trigger) return;
            previewEl.classList.remove('show');
        });
    }

    previewPrompt() {
        const content = document.getElementById('prompt-content').value;
        if (!content) return;
        
        // 简单的预览弹窗
        const previewWindow = window.open('', '_blank', 'width=600,height=400');
        previewWindow.document.write(`
            <html>
            <head>
                <title>Prompt 预览</title>
                <style>
                    body { font-family: system-ui; padding: 20px; line-height: 1.6; background: #1a1a2e; color: #e0e0e0; }
                    pre { background: #252540; padding: 15px; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; }
                </style>
            </head>
            <body>
                <h2>预览</h2>
                <pre>${content.replace(/</g, '&lt;')}</pre>
            </body>
            </html>
        `);
    }

    // 导出数据
    async exportData() {
        const data = await this.db.prompts.toArray();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prompt-vault-backup-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('数据已导出', 'success');
    }

    // 导入数据
    async importData(input) {
        const file = input.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (!Array.isArray(data)) {
                throw new Error('Invalid format: expected array');
            }
            
            // 处理导入的数据：移除 id 让数据库自动生成
            const processedData = data.map(item => {
                const { id, ...rest } = item;
                return {
                    ...rest,
                    createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
                    updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
                };
            });
            
            await this.db.prompts.bulkAdd(processedData);
            this.loadPrompts();
            this.showToast(`成功导入 ${processedData.length} 条数据`, 'success');
        } catch (error) {
            console.error('导入错误:', error);
            if (error.name === 'BulkError') {
                this.showToast('部分数据导入失败，可能存在重复项', 'warning');
            } else {
                this.showToast('导入失败，请检查文件格式', 'error');
            }
        }
        input.value = ''; // 重置 input
    }

    // 从当前页面捕获（浏览器扩展功能）
    async captureFromPage() {
        if (!isExtensionMode) {
            // 非扩展模式下显示提示
            const hint = document.getElementById('extension-hint');
            if (hint) hint.classList.remove('hidden');
            return;
        }
        
        try {
            this.showToast('正在捕获...', 'info');
            
            // 获取当前标签页
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                this.showToast('无法获取当前页面', 'error');
                return;
            }
            
            // 执行脚本获取选中的文本
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => window.getSelection().toString().trim()
            });
            
            const selectedText = results[0]?.result || '';
            
            if (!selectedText) {
                this.showToast('请先在页面中选中要保存的文本', 'warning');
                return;
            }
            
            // 填充数据并打开编辑弹窗
            const data = {
                content: selectedText,
                sourceUrl: tab.url,
                sourceTitle: tab.title
            };
            
            this.openModalWithData(data);
            this.showToast('已捕获选中内容', 'success');
            
        } catch (error) {
            console.error('捕获失败:', error);
            this.showToast('捕获失败: ' + error.message, 'error');
        }
    }

    // 使用数据打开编辑弹窗
    openModalWithData(data) {
        this.openModal();
        
        if (data.content) {
            document.getElementById('prompt-content').value = data.content;
            document.getElementById('char-count').textContent = `${data.content.length} 字符`;
        }
        
        if (data.sourceUrl) {
            // 生成标题
            const title = data.sourceTitle 
                ? `来自: ${data.sourceTitle}` 
                : `来自页面 ${new Date().toLocaleTimeString()}`;
            document.getElementById('prompt-title').value = title;
            
            // 显示来源信息
            const sourceInfo = document.getElementById('source-info');
            sourceInfo.textContent = `来源: ${data.sourceUrl}`;
            sourceInfo.classList.remove('hidden');
            
            // 保存来源信息以便保存时使用
            this.pendingSourceUrl = data.sourceUrl;
            this.pendingSourceTitle = data.sourceTitle;
        }
    }

    // 检查待处理的捕获数据
    async checkPendingCapture() {
        try {
            const result = await chrome.storage.local.get('pendingCapture');
            const data = result.pendingCapture;
            
            if (data) {
                // 清除待处理数据
                await chrome.storage.local.remove('pendingCapture');
                
                // 打开编辑弹窗并填充数据
                setTimeout(() => {
                    this.openModalWithData(data);
                }, 500);
            }
        } catch (error) {
            console.error('检查待处理数据失败:', error);
        }
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const iconMap = {
            'success': 'check-circle',
            'error': 'alert-circle',
            'warning': 'alert-triangle',
            'info': 'info'
        };
        
        toast.innerHTML = `
            <i data-lucide="${iconMap[type] || 'check-circle'}" class="w-5 h-5 toast-icon"></i>
            <span class="toast-message">${message}</span>
        `;
        
        container.appendChild(toast);
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PromptVault();
});
