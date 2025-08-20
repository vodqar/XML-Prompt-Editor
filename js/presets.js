/**
 * ===================================================================
 * XML 프롬프트 에디터 - 태그 프리셋 관리 (v2)
 * ===================================================================
 *
 * 이 파일 하나만 수정하여 사이드바의 모든 프리셋을 관리할 수 있습니다.
 * 이제 텍스트는 lang/*.json 파일에서 불러옵니다.
 *
 */

const TAG_PRESETS = [
    {
        titleKey: "category_basic",
        presets: [
            {
                key: "role",
                nameKey: "preset_role_name",
                icon: "fas fa-user",
                descriptionKey: "preset_role_desc",
                placeholderKey: "preset_role_placeholder"
            },
            {
                key: "instructions",
                nameKey: "preset_instructions_name",
                icon: "fas fa-list",
                descriptionKey: "preset_instructions_desc",
                placeholderKey: "preset_instructions_placeholder"
            },
            {
                key: "context",
                nameKey: "preset_context_name",
                icon: "fas fa-info-circle",
                descriptionKey: "preset_context_desc",
                placeholderKey: "preset_context_placeholder"
            },
            {
                key: "examples",
                nameKey: "preset_examples_name",
                icon: "fas fa-lightbulb",
                descriptionKey: "preset_examples_desc",
                placeholderKey: "preset_examples_placeholder"
            }
        ]
    },
    {
        titleKey: "category_advanced",
        presets: [
            {
                key: "thinking",
                nameKey: "preset_thinking_name",
                icon: "fas fa-brain",
                descriptionKey: "preset_thinking_desc",
                placeholderKey: "preset_thinking_placeholder",
                allowMultiple: false,
                promptTemplates: [
                    {
                        labelKey: "preset_thinking_template1_label",
                        valueKey: "preset_thinking_template1_value"
                    },
                    {
                        labelKey: "preset_thinking_template2_label",
                        valueKey: "preset_thinking_template2_value"
                    }
                ]
            },
            {
                key: "answer",
                nameKey: "preset_answers_name",
                icon: "fa-solid fa-comment-dots",
                descriptionKey: "preset_answers_desc",
                placeholderKey: "preset_answers_placeholder",
                allowMultiple: false,
                promptTemplates: [
                    {
                        labelKey: "preset_answers_template1_label",
                        valueKey: "preset_answers_template1_value"
                    }
                ]
            },           
            {
                key: "format",
                nameKey: "preset_format_name",
                icon: "fas fa-align-left",
                descriptionKey: "preset_format_desc",
                placeholderKey: "preset_format_placeholder"
            },
            {
                key: "constraints",
                nameKey: "preset_constraints_name",
                icon: "fas fa-exclamation-triangle",
                descriptionKey: "preset_constraints_desc",
                placeholderKey: "preset_constraints_placeholder"
            },
            {
                key: "output",
                nameKey: "preset_output_name",
                icon: "fas fa-arrow-right",
                descriptionKey: "preset_output_desc",
                placeholderKey: "preset_output_placeholder"
            }
            
        ]
    }
];