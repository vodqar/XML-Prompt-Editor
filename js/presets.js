/**
 * ===================================================================
 * XML 프롬프트 에디터 - 태그 프리셋 관리 (v2)
 * ===================================================================
 *
 * 이 파일 하나만 수정하여 사이드바의 모든 프리셋을 관리할 수 있습니다.
 *
 * --- 구조 설명 ---
 *
 * TAG_PRESETS: 카테고리 객체들을 담는 배열입니다.
 *
 * - category: {
 * title: "카테고리 제목", // 예: "기본 구조"
 * presets: [ // 이 카테고리에 속한 프리셋 태그 목록
 * {
 * key: "role", // 태그의 고유 키 (XML 태그명으로 사용)
 * name: "Role", // 버튼에 표시될 이름
 * icon: "fas fa-user", // Font Awesome 아이콘
 * description: "AI의 역할과 전문성을 정의합니다",
 * placeholder: "내용을 입력하세요...",
 *
 * // ✨ (선택) 프롬프트 템플릿 기능
 * allowMultiple: false, // true로 설정 시 여러 템플릿 중복 선택 가능
 * promptTemplates: [
 * {
 * label: "단계별 사고", // 템플릿 버튼에 표시될 이름
 * value: "단계별로 생각해주세요..." // 버튼 클릭 시 입력될 내용
 * },
 * // ... 다른 템플릿들
 * ]
 * },
 * // ... 다른 프리셋들
 * ]
 * },
 * // ... 다른 카테고리들
 *
 */

const TAG_PRESETS = [
    {
        title: "기본 구조",
        presets: [
            {
                key: "role",
                name: "Role",
                icon: "fas fa-user",
                description: "AI의 역할과 전문성을 정의합니다",
                placeholder: "당신은 경험이 풍부한 [전문분야] 전문가입니다.\n예: 당신은 10년 경력의 소프트웨어 아키텍트입니다."
            },
            {
                key: "instructions",
                name: "Instructions",
                icon: "fas fa-list",
                description: "구체적인 작업 지시사항",
                placeholder: "다음 작업을 수행해주세요:\n1. [구체적 단계]\n2. [명확한 지시]\n3. [원하는 결과]"
            },
            {
                key: "context",
                name: "Context",
                icon: "fas fa-info-circle",
                description: "배경 정보와 상황 설명",
                placeholder: "배경 정보:\n- 프로젝트 목적: [목적]\n- 대상 사용자: [사용자]\n- 제약사항: [제약]"
            },
            {
                key: "examples",
                name: "Examples",
                icon: "fas fa-lightbulb",
                description: "입출력 예시 (Few-shot)",
                placeholder: "예시 1:\n입력: [샘플 입력]\n출력: [원하는 출력]\n\n예시 2:\n입력: [다른 샘플]\n출력: [다른 출력]"
            }
        ]
    },
    {
        title: "고급 태그",
        presets: [
            {
                key: "thinking",
                name: "Thinking",
                icon: "fas fa-brain",
                description: "사고 과정 요청 (CoT)",
                placeholder: "사고 과정을 직접 입력하거나 위 템플릿을 선택하세요.",
                allowMultiple: false, // ✨ 중복 선택 활성화 예시
                promptTemplates: [
                    {
                        label: "순차적 사고 유도",
                        value: "[차근차근(Step by step) 생각하고, 생각한 과정을 이곳에 작성하세요.]"
                    },
                    {
                        label: "사고 유도",
                        value: "[이곳에 생각한 과정을 작성하세요.]"
                    }
                ]
            },
            {
                key: "format",
                name: "Format",
                icon: "fas fa-align-left",
                description: "출력 형식 지정",
                placeholder: "출력 형식을 직접 입력하거나 아래 템플릿을 선택하세요."
            },
            {
                key: "constraints",
                name: "Constraints",
                icon: "fas fa-exclamation-triangle",
                description: "제약조건과 규칙",
                placeholder: "제약사항:\n- 길이: 500자 이내\n- 톤: 전문적이고 친근하게\n- 금지사항: 추측성 내용 금지"
            },
            {
                key: "output",
                name: "Output",
                icon: "fas fa-arrow-right",
                description: "최종 출력 요구사항",
                placeholder: "최종 출력:\n- 형식: [JSON/Markdown/텍스트]\n- 포함사항: [필수 요소]\n- 제외사항: [불필요한 요소]"
            }
        ]
    }
];
