// 블록 관리 클래스
class PromptBlock {
    constructor(tagName, content = '', id = null) {
        this.id = id || this.generateId();
        this.tagName = tagName;
        this.content = content;
        
        // 새로운 TAG_PRESETS 구조에 맞게 프리셋 찾기
        const allPresets = TAG_PRESETS.flatMap(category => category.presets);
        this.preset = allPresets.find(p => p.key === tagName) || null;
    }

    generateId() {
        return 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // HTML 요소 생성
    createElement() {
        const blockElement = document.createElement('div');
        blockElement.className = 'prompt-block';
        blockElement.setAttribute('data-block-id', this.id);
        blockElement.draggable = true;

        const icon = this.preset ? `<i class="${this.preset.icon}"></i>` : '<i class="fas fa-tag"></i>';
        const placeholder = this.preset ? this.preset.placeholder : '내용을 입력하세요...';
        
        const templatesHTML = this.createTemplatesHTML();

        blockElement.innerHTML = `
            <div class="block-header">
                <div class="block-tag">
                    ${icon}
                    <span>&lt;${this.tagName}&gt;</span>
                </div>
                <div class="block-actions">
                    <button class="block-btn move" title="이동"><i class="fas fa-grip-vertical"></i></button>
                    <button class="block-btn delete" title="삭제"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="block-content">
                ${templatesHTML}
                <textarea placeholder="${placeholder}" rows="4">${this.content}</textarea>
            </div>
        `;
        this.attachEventListeners(blockElement);
        return blockElement;
    }

    createTemplatesHTML() {
        if (!this.preset || !this.preset.promptTemplates) return '';
        const buttonsHTML = this.preset.promptTemplates.map((template, index) => 
            `<button class="template-btn" data-template-index="${index}">${template.label}</button>`
        ).join('');
        return `<div class="template-container">${buttonsHTML}</div>`;
    }

    // 이벤트 리스너 연결
    attachEventListeners(element) {
        const textarea = element.querySelector('textarea');
        const deleteBtn = element.querySelector('.block-btn.delete');

        // ✨ 수정: 사용자의 직접 입력을 감지
        textarea.addEventListener('input', (e) => this.handleTextareaInput(e, false)); // isTemplateClick는 false
        deleteBtn.addEventListener('click', () => window.blockManager.removeBlock(this.id));
        
        const templateContainer = element.querySelector('.template-container');
        if (templateContainer) {
            templateContainer.addEventListener('click', (e) => this.handleTemplateClick(e));
        }

        element.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', this.id);
            element.classList.add('dragging');
        });
        element.addEventListener('dragend', () => element.classList.remove('dragging'));
    }

    // 템플릿 버튼 클릭 핸들러
    handleTemplateClick(e) {
        const clickedBtn = e.target.closest('.template-btn');
        if (!clickedBtn) return;

        const textarea = clickedBtn.closest('.block-content').querySelector('textarea');
        const templateContainer = clickedBtn.parentElement;
        const allowMultiple = this.preset.allowMultiple || false;

        if (allowMultiple) {
            clickedBtn.classList.toggle('active');
            
            const activeTemplates = Array.from(templateContainer.querySelectorAll('.template-btn.active'))
                .map(btn => {
                    const index = parseInt(btn.dataset.templateIndex);
                    return this.preset.promptTemplates[index].value;
                });
            
            textarea.value = activeTemplates.join('\n\n---\n\n');
        } else {
            const isActive = clickedBtn.classList.contains('active');
            templateContainer.querySelectorAll('.template-btn').forEach(btn => btn.classList.remove('active'));
            
            if (isActive) {
                textarea.value = '';
            } else {
                clickedBtn.classList.add('active');
                const index = parseInt(clickedBtn.dataset.templateIndex);
                textarea.value = this.preset.promptTemplates[index].value;
            }
        }
        
        // ✨ 수정: 템플릿 클릭으로 인한 업데이트임을 명시
        this.handleTextareaInput({ target: textarea }, true); // isTemplateClick를 true로 전달
        textarea.focus();
    }
    
    // ✨ 수정: 텍스트 영역 입력 핸들러에 isTemplateClick 파라미터 추가
    handleTextareaInput(e, isTemplateClick = false) {
        this.content = e.target.value;
        this.autoResize(e);
        if (window.blockManager) {
            window.blockManager.updatePreview();
        }

        // ✨ 수정: 사용자가 직접 입력했을 때만 (isTemplateClick가 false일 때) 하이라이트 해제
        if (!isTemplateClick && !this.preset.allowMultiple) {
            const blockElement = document.querySelector(`[data-block-id="${this.id}"]`);
            if(blockElement) {
                blockElement.querySelectorAll('.template-btn.active').forEach(btn => btn.classList.remove('active'));
            }
        }
    }

    autoResize(e) {
        e.target.style.height = 'auto';
        e.target.style.height = (e.target.scrollHeight) + 'px';
    }

    toXML() {
        if (!this.content.trim()) return `<${this.tagName}></${this.tagName}>`;
        return `<${this.tagName}>\n${this.content}\n</${this.tagName}>`;
    }
}


// --- 이하 BlockManagerClass 코드는 변경사항 없습니다 ---

class BlockManagerClass {
    constructor() {
        this.blocks = [];
        this.container = null;
        this.previewElement = null;
        this.emptyState = null;
    }
    init() {
        this.container = document.getElementById('blockContainer');
        this.previewElement = document.getElementById('previewCode');
        this.emptyState = document.getElementById('emptyState');
        if (!this.container || !this.previewElement || !this.emptyState) {
            console.error('필수 DOM 요소를 찾을 수 없습니다.');
            return false;
        }
        this.setupDragAndDrop();
        this.updateDisplay();
        return true;
    }
    addBlock(tagName, content = '') {
        const block = new PromptBlock(tagName, content);
        this.blocks.push(block);
        this.renderBlock(block);
        this.updateDisplay();
        setTimeout(() => {
            const element = this.container.querySelector(`[data-block-id="${block.id}"] textarea`);
            if (element) element.focus();
        }, 100);
    }
    removeBlock(blockId) {
        const index = this.blocks.findIndex(block => block.id === blockId);
        if (index === -1) return;
        const element = this.container.querySelector(`[data-block-id="${blockId}"]`);
        if (!element) return;
        const BLOCK_SCALE_DURATION = 300;
        const BLOCK_HEIGHT_DURATION = 350;
        element.classList.add('block-removing');
        element.style.transition = 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        element.style.transform = 'scale(0.8)';
        element.style.opacity = '0';
        element.style.pointerEvents = 'none';
        setTimeout(() => {
            const currentHeight = element.offsetHeight;
            const currentMargin = parseInt(getComputedStyle(element).marginBottom) || 0;
            element.style.height = currentHeight + 'px';
            element.style.marginBottom = currentMargin + 'px';
            element.style.overflow = 'hidden';
            requestAnimationFrame(() => {
                element.style.transition = 'height 0.3s cubic-bezier(0.165, 0.84, 0.44, 1), margin-bottom 0.3s cubic-bezier(0.165, 0.84, 0.44, 1)';
                element.style.height = '0px';
                element.style.marginBottom = '0px';
            });
            setTimeout(() => {
                this.blocks.splice(index, 1);
                element.remove();
                this.updateDisplay();
            }, BLOCK_HEIGHT_DURATION);
        }, BLOCK_SCALE_DURATION);
    }
    renderBlock(block) {
        const element = block.createElement();
        const BLOCK_ENTER_ANIMATION_DURATION = 500;
        element.classList.add('block-entering');
        this.container.appendChild(element);
        setTimeout(() => {
            element.classList.remove('block-entering');
        }, BLOCK_ENTER_ANIMATION_DURATION);
    }
    renderAllBlocks() {
        this.container.innerHTML = '';
        this.blocks.forEach(block => this.renderBlock(block));
    }
    setupDragAndDrop() {
        this.container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingElement = this.container.querySelector('.dragging');
            if (!draggingElement) return;
            const afterElement = this.getDragAfterElement(this.container, e.clientY);
            if (afterElement == null) {
                this.container.appendChild(draggingElement);
            } else {
                this.container.insertBefore(draggingElement, afterElement);
            }
        });
        this.container.addEventListener('drop', (e) => {
            e.preventDefault();
            this.updateBlockOrder();
        });
    }
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.prompt-block:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    updateBlockOrder() {
        const elements = [...this.container.querySelectorAll('.prompt-block')];
        const newOrder = elements.map(el => {
            const blockId = el.getAttribute('data-block-id');
            return this.blocks.find(block => block.id === blockId);
        }).filter(Boolean);
        this.blocks = newOrder;
        this.updatePreview();
    }
    updateDisplay() {
        if (this.blocks.length === 0) {
            this.emptyState.style.display = 'block';
            this.container.style.display = 'none';
        } else {
            this.emptyState.style.display = 'none';
            this.container.style.display = 'flex';
        }
        this.updatePreview();
    }
    updatePreview() {
        const xmlOutput = this.generateXML();
        this.previewElement.textContent = xmlOutput;
    }
    generateXML() {
        if (this.blocks.length === 0) return '';
        return this.blocks.map(block => block.toXML()).join('\n\n');
    }
    clearProject() {
        if (this.blocks.length > 0 && !confirm('모든 블록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            return;
        }
        this.blocks = [];
        this.container.innerHTML = '';
        this.updateDisplay();
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    Object.assign(notification.style, {
        position: 'fixed', top: '20px', right: '20px', padding: '1rem 1.5rem',
        backgroundColor: type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3',
        color: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: '10000', animation: 'slideInFromRight 0.3s ease-out'
    });
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOutToRight 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
