class LanguageManager {
    constructor() {
        this.translations = {};
        // localStorage에 저장된 언어가 있으면 가져오고, 없으면 'ko'를 기본값으로 사용
        this.currentLang = localStorage.getItem('preferredLang') || 'ko';
    }

    /**
     * 지정된 언어의 JSON 파일을 불러와 translations 객체에 저장합니다.
     * @param {string} lang - 불러올 언어 코드 (예: 'ko', 'en')
     */
    async loadLanguage(lang) {
        try {
            const response = await fetch(`lang/${lang}.json`);
            if (!response.ok) {
                throw new Error(`언어 파일 로딩 실패: ${lang}.json`);
            }
            this.translations = await response.json();
            this.currentLang = lang;
            document.documentElement.lang = lang; // HTML lang 속성 변경
            // 사용자가 선택한 언어를 localStorage에 저장
            localStorage.setItem('preferredLang', lang);
        } catch (error) {
            console.error(error);
            localStorage.removeItem('preferredLang'); // 에러 발생 시 저장된 값 삭제
            if (lang !== 'ko') {
                await this.loadLanguage('ko');
            }
        }
    }

    /**
     * 주어진 key에 해당하는 번역된 텍스트를 반환합니다.
     * @param {string} key - 번역을 찾을 키
     * @returns {string} 번역된 텍스트. 없으면 key 자체를 반환.
     */
    t(key) {
        return this.translations[key] || key;
    }

    /**
     * HTML 문서 전체를 순회하며 data-i18n-key 속성을 가진 요소들의 내용을
     * 현재 선택된 언어의 텍스트로 교체합니다.
     */
    updateContent() {
        document.querySelectorAll('[data-i18n-key]').forEach(element => {
            const key = element.getAttribute('data-i18n-key');
            const target = element.getAttribute('data-i18n-target');
            const text = this.t(key);

            if (target) {
                element.setAttribute(target, text);
            } else {
                const span = element.querySelector('span[data-i18n-key]');
                if (span) {
                    span.textContent = text;
                } else {
                    const textNode = Array.from(element.childNodes).find(node => 
                        node.nodeType === Node.TEXT_NODE && node.textContent.trim()
                    );
                    if (textNode) {
                        textNode.textContent = ` ${text}`;
                    } else {
                        element.textContent = text;
                    }
                }
            }
        });
        document.title = this.t('app_title');
    }

    /**
     * 앱 초기화 시 호출될 메인 함수입니다.
     * 저장된 언어 또는 브라우저 언어를 감지하고, 해당 언어 파일을 불러온 뒤 화면을 업데이트합니다.
     */
    async init() {
        // 저장된 언어가 없으면 브라우저 언어를 감지
        const initialLang = localStorage.getItem('preferredLang') || (navigator.language.startsWith('ko') ? 'ko' : 'en');
        await this.loadLanguage(initialLang);
        this.updateContent();
    }
}

const i18n = new LanguageManager();