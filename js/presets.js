/**
 * XML 프롬프트 에디터 - 태그 프리셋 관리
 * 미리 정의된 태그 템플릿과 자동완성 기능 제공
 */

// 태그 프리셋 데이터
const TAG_PRESETS = {
    // 기본 구조 태그
    role: {
        name: 'Role',
        icon: 'fas fa-user',
        description: 'AI의 역할과 전문성을 정의합니다',
        placeholder: '당신은 경험이 풍부한 [전문분야] 전문가입니다.\n예: 당신은 10년 경력의 소프트웨어 아키텍트입니다.',
        category: 'basic'
    },
    instructions: {
        name: 'Instructions',
        icon: 'fas fa-list',
        description: '구체적인 작업 지시사항',
        placeholder: '다음 작업을 수행해주세요:\n1. [구체적 단계]\n2. [명확한 지시]\n3. [원하는 결과]',
        category: 'basic'
    },
    context: {
        name: 'Context',
        icon: 'fas fa-info-circle',
        description: '배경 정보와 상황 설명',
        placeholder: '배경 정보:\n- 프로젝트 목적: [목적]\n- 대상 사용자: [사용자]\n- 제약사항: [제약]',
        category: 'basic'
    },
    examples: {
        name: 'Examples',
        icon: 'fas fa-lightbulb',
        description: '입출력 예시 (Few-shot)',
        placeholder: '예시 1:\n입력: [샘플 입력]\n출력: [원하는 출력]\n\n예시 2:\n입력: [다른 샘플]\n출력: [다른 출력]',
        category: 'basic'
    },
    
    // 고급 태그
    thinking: {
        name: 'Thinking',
        icon: 'fas fa-brain',
        description: '사고 과정 요청 (CoT)',
        placeholder: '단계별로 생각해주세요:\n1. 문제를 분석하고\n2. 가능한 접근법을 고려한 후\n3. 최적의 해결책을 제시해주세요.',
        category: 'advanced'
    },
    format: {
        name: 'Format',
        icon: 'fas fa-align-left',
        description: '출력 형식 지정',
        placeholder: '다음 형식으로 답변해주세요:\n\n## 제목\n- 요점 1\n- 요점 2\n\n**결론:** [요약]',
        category: 'advanced'
    },
    constraints: {
        name: 'Constraints',
        icon: 'fas fa-exclamation-triangle',
        description: '제약조건과 규칙',
        placeholder: '제약사항:\n- 길이: 500자 이내\n- 톤: 전문적이고 친근하게\n- 금지사항: 추측성 내용 금지',
        category: 'advanced'
    },
    output: {
        name: 'Output',
        icon: 'fas fa-arrow-right',
        description: '최종 출력 요구사항',
        placeholder: '최종 출력:\n- 형식: [JSON/Markdown/텍스트]\n- 포함사항: [필수 요소]\n- 제외사항: [불필요한 요소]',
        category: 'advanced'
    }
};

/**
 * 자동완성 시스템 클래스
 * 사용자 입력에 대해 태그 제안 기능 제공
 */
class AutoCompleteSystem {
    constructor() {
        this.suggestions = [];
        this.currentInput = null;
        this.suggestionBox = null;
        this.selectedIndex = -1;
        this.isInitialized = false;
        
        // 인스턴스 생성 시 자동으로 초기화
        this.init();
    }

    /**
     * 제안 박스 DOM 요소 생성 및 이벤트 리스너 등록
     */
    init() {
        if (this.isInitialized) return;
        
        this.createSuggestionBox();
        this.bindEvents();
        this.isInitialized = true;
    }

    /**
     * 제안 박스 DOM 요소 생성
     */
    createSuggestionBox() {
        this.suggestionBox = document.createElement('div');
        this.suggestionBox.className = 'autocomplete-suggestions';
        this.suggestionBox.style.display = 'none';
        document.body.appendChild(this.suggestionBox);
    }

    /**
     * 전역 이벤트 리스너 등록
     */
    bindEvents() {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.autocomplete-suggestions')) {
                this.hideSuggestions();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideSuggestions();
            }
        });
    }

    /**
     * 입력된 텍스트에 기반한 태그 제안 생성
     */
    getSuggestions(input) {
        const normalizedInput = input.toLowerCase().trim();
        if (normalizedInput.length < 1) return [];

        const tagSuggestions = Object.keys(TAG_PRESETS)
            .filter(tag => tag.includes(normalizedInput))
            .map(tag => ({
                type: 'preset',
                value: tag,
                label: TAG_PRESETS[tag].name,
                icon: TAG_PRESETS[tag].icon,
                description: TAG_PRESETS[tag].description
            }));

        const commonTags = ['task', 'goal', 'steps', 'notes', 'summary', 'analysis', 'result'];
        const commonSuggestions = commonTags
            .filter(tag => tag.includes(normalizedInput) && !Object.keys(TAG_PRESETS).includes(tag))
            .map(tag => ({
                type: 'common',
                value: tag,
                label: this.capitalize(tag),
                icon: 'fas fa-tag',
                description: '일반 태그'
            }));

        return [...tagSuggestions, ...commonSuggestions].slice(0, 8);
    }

    /**
     * 문자열 첫 글자를 대문자로 변환
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * 제안 목록 표시
     */
    showSuggestions(input, targetElement) {
        this.currentInput = targetElement;
        this.suggestions = this.getSuggestions(input);
        
        if (this.suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        this.renderSuggestions();
        this.positionSuggestionBox(targetElement);
        this.suggestionBox.style.display = 'block';
        this.selectedIndex = -1;
    }

    /**
     * 제안 항목들을 HTML로 렌더링
     */
    renderSuggestions() {
        this.suggestionBox.innerHTML = this.suggestions.map((suggestion, index) => `
            <div class="suggestion-item" data-index="${index}">
                <div class="suggestion-icon">
                    <i class="${suggestion.icon}"></i>
                </div>
                <div class="suggestion-content">
                    <div class="suggestion-label">${suggestion.label}</div>
                    <div class="suggestion-description">${suggestion.description}</div>
                </div>
                <div class="suggestion-value">&lt;${suggestion.value}&gt;</div>
            </div>
        `).join('');

        this.suggestionBox.querySelectorAll('.suggestion-item').forEach((item, index) => {
            item.addEventListener('click', () => this.selectSuggestion(index));
        });
    }

    /**
     * 제안 박스를 타겟 요소 근처에 위치시킴
     */
    positionSuggestionBox(targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        this.suggestionBox.style.left = `${rect.left + scrollLeft}px`;
        this.suggestionBox.style.top = `${rect.bottom + scrollTop + 5}px`;
        this.suggestionBox.style.minWidth = `${rect.width}px`;
    }

    /**
     * 제안 항목 선택 처리
     */
    selectSuggestion(index) {
        if (index >= 0 && index < this.suggestions.length) {
            const suggestion = this.suggestions[index];
            if (window.blockManager) {
                window.blockManager.addBlock(suggestion.value);
            }
            this.hideSuggestions();
        }
    }

    /**
     * 키보드 네비게이션 처리
     */
    handleKeyNavigation(e) {
        if (!this.suggestionBox || this.suggestionBox.style.display === 'none') {
            return false;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
                this.highlightSelection();
                return true;

            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                this.highlightSelection();
                return true;

            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0) {
                    this.selectSuggestion(this.selectedIndex);
                }
                return true;

            case 'Escape':
                this.hideSuggestions();
                return true;

            default:
                return false;
        }
    }

    /**
     * 선택된 항목을 시각적으로 하이라이트
     */
    highlightSelection() {
        this.suggestionBox.querySelectorAll('.suggestion-item').forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });
    }

    /**
     * 제안 박스 숨기기
     */
    hideSuggestions() {
        if (this.suggestionBox) {
            this.suggestionBox.style.display = 'none';
        }
        this.selectedIndex = -1;
        this.currentInput = null;
    }
}

window.autoComplete = new AutoCompleteSystem();