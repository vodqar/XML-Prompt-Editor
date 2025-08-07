// 블록 관리 클래스
class PromptBlock {
    constructor(tagName, content = '', id = null) {
        this.id = id || this.generateId();
        this.tagName = tagName;
        this.content = content;
        this.preset = TAG_PRESETS[tagName] || null;
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

        blockElement.innerHTML = `
            <div class="block-header">
                <div class="block-tag">
                    ${icon}
                    <span>&lt;${this.tagName}&gt;</span>
                </div>
                <div class="block-actions">
                    <button class="block-btn move" title="이동">
                        <i class="fas fa-grip-vertical"></i>
                    </button>
                    <button class="block-btn delete" title="삭제">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="block-content">
                <textarea 
                    placeholder="${placeholder}"
                    rows="4"
                >${this.content}</textarea>
            </div>
        `;

        // 이벤트 리스너 추가
        this.attachEventListeners(blockElement);

        return blockElement;
    }

    // 이벤트 리스너 연결
    attachEventListeners(element) {
        const textarea = element.querySelector('textarea');
        const deleteBtn = element.querySelector('.block-btn.delete');

        textarea.addEventListener('input', (e) => {
            this.content = e.target.value;
            if (window.blockManager) {
                window.blockManager.updatePreview();
            }
        });

        textarea.addEventListener('input', this.autoResize);
        
        deleteBtn.addEventListener('click', () => {
            if (window.blockManager) {
                window.blockManager.removeBlock(this.id);
            }
        });

        element.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', this.id);
            element.classList.add('dragging');
        });

        element.addEventListener('dragend', () => {
            element.classList.remove('dragging');
        });
    }

    // 텍스트 영역 자동 크기 조절
    autoResize(e) {
        e.target.style.height = 'auto';
        e.target.style.height = (e.target.scrollHeight) + 'px';
    }

    // XML 형태로 출력
    toXML() {
        if (!this.content.trim()) {
            return `<${this.tagName}></${this.tagName}>`;
        }
        return `<${this.tagName}>\n${this.content}\n</${this.tagName}>`;
    }
}

// 블록 매니저 클래스
class BlockManagerClass {
    constructor() {
        this.blocks = [];
        this.container = null;
        this.previewElement = null;
        this.emptyState = null;
    }

    // 초기화
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

    // 블록 추가
    addBlock(tagName, content = '') {
        const block = new PromptBlock(tagName, content);
        this.blocks.push(block);
        this.renderBlock(block);
        this.updateDisplay();
        
        // 새로 추가된 블록의 텍스트 영역에 포커스
        setTimeout(() => {
            const element = this.container.querySelector(`[data-block-id="${block.id}"] textarea`);
            if (element) element.focus();
        }, 100);
    }

    // 블록 삭제
    removeBlock(blockId) {
        const index = this.blocks.findIndex(block => block.id === blockId);
        if (index === -1) return;

        const element = this.container.querySelector(`[data-block-id="${blockId}"]`);
        if (!element) return;

        // 블록 삭제 애니메이션 상수
        const BLOCK_SCALE_DURATION = 300;
        const BLOCK_HEIGHT_DURATION = 350;

        // 1단계: 블록 축소 및 투명화
        element.classList.add('block-removing');
        element.style.transition = 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        element.style.transform = 'scale(0.8)';
        element.style.opacity = '0';
        element.style.pointerEvents = 'none';

        // 2단계: 높이 축소
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

            // 3단계: 완전 제거
            setTimeout(() => {
                this.blocks.splice(index, 1);
                element.remove();
                this.updateDisplay();
            }, BLOCK_HEIGHT_DURATION);
            
        }, BLOCK_SCALE_DURATION);
    }

    // 블록 렌더링
    renderBlock(block) {
        const element = block.createElement();
        const BLOCK_ENTER_ANIMATION_DURATION = 500;
        
        element.classList.add('block-entering');
        
        this.container.appendChild(element);
        
        setTimeout(() => {
            element.classList.remove('block-entering');
        }, BLOCK_ENTER_ANIMATION_DURATION);
    }

    // 모든 블록 다시 렌더링
    renderAllBlocks() {
        this.container.innerHTML = '';
        this.blocks.forEach(block => {
            this.renderBlock(block);
        });
    }

    // 드래그 앤 드롭 설정
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

    // 드래그 위치 계산
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

    // 블록 순서 업데이트
    updateBlockOrder() {
        const elements = [...this.container.querySelectorAll('.prompt-block')];
        const newOrder = elements.map(el => {
            const blockId = el.getAttribute('data-block-id');
            return this.blocks.find(block => block.id === blockId);
        }).filter(Boolean);
        
        this.blocks = newOrder;
        this.updatePreview();
    }

    // 화면 표시 업데이트
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

    // 미리보기 업데이트
    updatePreview() {
        const xmlOutput = this.generateXML();
        this.previewElement.textContent = xmlOutput;
    }

    // XML 생성
    generateXML() {
        if (this.blocks.length === 0) {
            return '';
        }
        
        return this.blocks.map(block => block.toXML()).join('\n\n');
    }

    // 프로젝트 초기화 (모두 삭제)
    clearProject() {
        if (this.blocks.length > 0 && !confirm('모든 블록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            return;
        }
        
        this.blocks = [];
        this.container.innerHTML = '';
        this.updateDisplay();
    }
}

// 알림 표시 함수 (전역 유틸리티로 분리)
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        backgroundColor: type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3',
        color: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: '10000',
        animation: 'slideInFromRight 0.3s ease-out'
    });
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutToRight 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}