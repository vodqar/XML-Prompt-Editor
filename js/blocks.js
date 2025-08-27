// --- Constants ---
const CSS_CLASSES = {
    PROMPT_BLOCK: 'prompt-block',
    BLOCK_HEADER: 'block-header',
    BLOCK_TAG: 'block-tag',
    BLOCK_ACTIONS: 'block-actions',
    BLOCK_BTN: 'block-btn',
    MOVE_BTN: 'move',
    DELETE_BTN: 'delete',
    BLOCK_CONTENT: 'block-content',
    TEMPLATE_CONTAINER: 'template-container',
    TEMPLATE_BTN: 'template-btn',
    ACTIVE: 'active',
    DEFAULT_ICON: 'fas fa-tag',
    AUTOCOMPLETE_SUGGESTIONS: 'autocomplete-suggestions',
    AUTOCOMPLETE_ITEM: 'autocomplete-item',
    AUTOCOMPLETE_SHOW: 'show',
    AUTOCOMPLETE_SELECTED: 'selected',
    BLOCK_ENTERING: 'block-entering',
    BLOCK_REMOVING: 'block-removing',
    NOTIFICATION_CAPSULE: 'notification-capsule',
};

const KEY_CODES = {
    ARROW_DOWN: 'ArrowDown',
    ARROW_UP: 'ArrowUp',
    ENTER: 'Enter',
    TAB: 'Tab',
    ESCAPE: 'Escape',
};

const ANIMATION_DURATIONS = {
    BLOCK_ENTER: 500,
    BLOCK_SCALE: 300,
    BLOCK_HEIGHT: 350,
    SORTABLE: 150,
    NOTIFICATION_FADEOUT: 2500,
    AUTOCOMPLETE_HIDE_DELAY: 200,
};

// --- PromptBlock Class ---
/**
 * Represents a single editable block in the prompt editor.
 */
class PromptBlock {
    constructor(tagName, content = '', id = null) {
        this.id = id || this._generateId();
        this.tagName = tagName;
        this.content = content;
        this.element = null; // Cache the element
        this.textarea = null; // Cache the textarea

        // Find the corresponding preset for this block, if any.
        const allPresets = TAG_PRESETS.flatMap(category => category.presets);
        this.preset = allPresets.find(p => p.key === tagName) || null;

        // State for the autocomplete functionality.
        this.autocomplete = {
            active: false,
            triggerIndex: -1,
            activeIndex: -1,
            suggestions: [],
            element: null, // The autocomplete dropdown element
        };
    }

    /**
     * Generates a unique ID for the block.
     * @private
     * @returns {string} A unique identifier.
     */
    _generateId() {
        return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Creates the HTML element for this block.
     * @returns {HTMLElement} The block's root element.
     */
    createElement() {
        const blockElement = document.createElement('div');
        blockElement.className = CSS_CLASSES.PROMPT_BLOCK;
        blockElement.setAttribute('data-block-id', this.id);

        const iconClass = this.preset ? this.preset.icon : CSS_CLASSES.DEFAULT_ICON;
        const placeholderText = this.preset ? i18n.t(this.preset.placeholderKey) : i18n.t('default_block_placeholder');
        const placeholder = placeholderText.replace(/\\n/g, '&#10;');
        
        const templatesHTML = this._createTemplatesHTML();

        blockElement.innerHTML = `
            <div class="${CSS_CLASSES.BLOCK_HEADER}">
                <div class="${CSS_CLASSES.BLOCK_TAG}">
                    <i class="${iconClass}"></i>
                    <span>&lt;${this.tagName}&gt;</span>
                </div>
                <div class="${CSS_CLASSES.BLOCK_ACTIONS}">
                    <button class="${CSS_CLASSES.BLOCK_BTN} ${CSS_CLASSES.MOVE_BTN}" title="Move"><i class="fas fa-grip-vertical"></i></button>
                    <button class="${CSS_CLASSES.BLOCK_BTN} ${CSS_CLASSES.DELETE_BTN}" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="${CSS_CLASSES.BLOCK_CONTENT}">
                ${templatesHTML}
                <textarea placeholder="${placeholder}" rows="4">${this.content}</textarea>
            </div>
        `;
        
        this.element = blockElement;
        this.textarea = blockElement.querySelector('textarea');
        
        this._attachEventListeners();
        return blockElement;
    }

    /**
     * Creates the HTML for template buttons, if applicable.
     * @private
     * @returns {string} The HTML string for the template container.
     */
    _createTemplatesHTML() {
        if (!this.preset || !this.preset.promptTemplates) return '';
        
        const buttonsHTML = this.preset.promptTemplates.map((template, index) => 
            `<button class="${CSS_CLASSES.TEMPLATE_BTN}" data-template-index="${index}">${i18n.t(template.labelKey)}</button>`
        ).join('');
        
        return `<div class="${CSS_CLASSES.TEMPLATE_CONTAINER}">${buttonsHTML}</div>`;
    }

    /**
     * Attaches event listeners to the block's element.
     * @private
     */
    _attachEventListeners() {
        const deleteBtn = this.element.querySelector(`.${CSS_CLASSES.DELETE_BTN}`);

        this.textarea.addEventListener('input', (e) => this._handleTextareaInput(e));
        this.textarea.addEventListener('keydown', (e) => this._handleKeyDown(e));
        this.textarea.addEventListener('blur', () => this._hideAutocomplete());
        
        deleteBtn.addEventListener('click', () => window.blockManager.removeBlock(this.id));
        
        const templateContainer = this.element.querySelector(`.${CSS_CLASSES.TEMPLATE_CONTAINER}`);
        if (templateContainer) {
            templateContainer.addEventListener('click', (e) => this._handleTemplateClick(e));
        }
    }

    /**
     * Handles clicks on template buttons.
     * @private
     * @param {MouseEvent} e - The click event.
     */
    _handleTemplateClick(e) {
        const clickedBtn = e.target.closest(`.${CSS_CLASSES.TEMPLATE_BTN}`);
        if (!clickedBtn) return;

        const templateContainer = clickedBtn.parentElement;
        const allowMultiple = this.preset.allowMultiple || false;

        if (allowMultiple) {
            this._toggleMultipleTemplate(clickedBtn, templateContainer);
        } else {
            this._toggleSingleTemplate(clickedBtn, templateContainer);
        }
        
        // Manually trigger input event to update content and preview
        this._handleTextareaInput({ target: this.textarea }, true);
        this.textarea.focus();
    }

    /**
     * Toggles a template button for presets that allow multiple selections.
     * @private
     */
    _toggleMultipleTemplate(clickedBtn, templateContainer) {
        clickedBtn.classList.toggle(CSS_CLASSES.ACTIVE);
        const activeTemplates = Array.from(templateContainer.querySelectorAll(`.${CSS_CLASSES.TEMPLATE_BTN}.${CSS_CLASSES.ACTIVE}`))
            .map(btn => {
                const index = parseInt(btn.dataset.templateIndex);
                return i18n.t(this.preset.promptTemplates[index].valueKey);
            });
        this.textarea.value = activeTemplates.join('\n\n---\n\n');
    }

    /**
     * Toggles a template button for presets that only allow a single selection.
     * @private
     */
    _toggleSingleTemplate(clickedBtn, templateContainer) {
        const isActive = clickedBtn.classList.contains(CSS_CLASSES.ACTIVE);
        templateContainer.querySelectorAll(`.${CSS_CLASSES.TEMPLATE_BTN}`).forEach(btn => btn.classList.remove(CSS_CLASSES.ACTIVE));
        
        if (isActive) {
            this.textarea.value = '';
        } else {
            clickedBtn.classList.add(CSS_CLASSES.ACTIVE);
            const index = parseInt(clickedBtn.dataset.templateIndex);
            this.textarea.value = i18n.t(this.preset.promptTemplates[index].valueKey);
        }
    }
    
    /**
     * Handles input events on the textarea.
     * @private
     * @param {Event} e - The input event.
     * @param {boolean} isTemplateClick - Whether the input was triggered by a template click.
     */
    _handleTextareaInput(e, isTemplateClick = false) {
        this.content = e.target.value;
        this._autoResize(e.target);
        window.blockManager.updatePreview();

        this._handleAutocompleteTrigger(e.target);

        // If a template was not clicked and multiple selections are not allowed,
        // deselect any active template buttons as the user is typing custom content.
        if (!isTemplateClick && this.preset && !this.preset.allowMultiple) {
            this.element.querySelectorAll(`.${CSS_CLASSES.TEMPLATE_BTN}.${CSS_CLASSES.ACTIVE}`)
                .forEach(btn => btn.classList.remove(CSS_CLASSES.ACTIVE));
        }
    }

    /**
     * Checks for the autocomplete trigger ('<') and shows suggestions.
     * @private
     * @param {HTMLTextAreaElement} textarea - The textarea element.
     */
    _handleAutocompleteTrigger(textarea) {
        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = this.content.substring(0, cursorPos);
        const triggerMatch = textBeforeCursor.match(/<([a-zA-Z0-9_-]*)$/);

        if (triggerMatch) {
            this.autocomplete.active = true;
            this.autocomplete.triggerIndex = triggerMatch.index;
            const query = triggerMatch[1];
            this._showAutocomplete(query, textarea);
        } else {
            this._hideAutocomplete();
        }
    }

    /**
     * Automatically resizes the textarea to fit its content.
     * @private
     * @param {HTMLTextAreaElement} textarea - The textarea element.
     */
    _autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }

    /**
     * Converts the block's data to an XML string.
     * @returns {string} The XML representation of the block.
     */
    toXML() {
        if (!this.content.trim()) {
            return `<${this.tagName}></${this.tagName}>`;
        }
        return `<${this.tagName}>
${this.content}
</${this.tagName}>`;
    }

    // --- Autocomplete Methods ---

    /**
     * Shows the autocomplete suggestion box.
     * @private
     * @param {string} query - The search query for tags.
     * @param {HTMLTextAreaElement} textarea - The textarea element.
     */
    _showAutocomplete(query, textarea) {
        const suggestions = window.blockManager.getUsedTags()
            .filter(tag => tag.toLowerCase().startsWith(query.toLowerCase()) && tag !== this.tagName);

        if (suggestions.length === 0) {
            this._hideAutocomplete();
            return;
        }
        
        this.autocomplete.suggestions = suggestions;

        // Create autocomplete element if it doesn't exist
        if (!this.autocomplete.element) {
            this.autocomplete.element = document.createElement('div');
            this.autocomplete.element.className = CSS_CLASSES.AUTOCOMPLETE_SUGGESTIONS;
            document.body.appendChild(this.autocomplete.element);

            // Use mousedown to prevent blur event from firing before click
            this.autocomplete.element.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Prevent textarea from losing focus
                const target = e.target.closest(`.${CSS_CLASSES.AUTOCOMPLETE_ITEM}`);
                if (target) {
                    this._selectAutocomplete(parseInt(target.dataset.index), textarea);
                }
            });
        }

        this.autocomplete.element.innerHTML = suggestions.map((tag, index) =>
            `<div class="${CSS_CLASSES.AUTOCOMPLETE_ITEM}" data-index="${index}">${tag}</div>`
        ).join('');

        this._positionAutocomplete(textarea);
        this.autocomplete.element.classList.add(CSS_CLASSES.AUTOCOMPLETE_SHOW);

        this.autocomplete.activeIndex = 0;
        this._updateActiveSuggestion();
    }
    
    /**
     * Positions the autocomplete element relative to the cursor in the textarea.
     * @private
     * @param {HTMLTextAreaElement} textarea 
     */
    _positionAutocomplete(textarea) {
        const rect = textarea.getBoundingClientRect();
        const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight);
        
        // This is a simplified calculation. For a more precise position,
        // we might need a hidden div to measure the text width.
        const textToCursor = textarea.value.substring(0, this.autocomplete.triggerIndex);
        const lines = textToCursor.split('\n').length;
        
        const top = rect.top + (lines * lineHeight) + window.scrollY;
        const left = rect.left + window.scrollX; // Simplified left position

        this.autocomplete.element.style.top = `${top}px`;
        this.autocomplete.element.style.left = `${left}px`;
    }

    /**
     * Hides the autocomplete suggestion box.
     * @private
     */
    _hideAutocomplete() {
        if (!this.autocomplete.active) return;
        this.autocomplete.active = false;
        
        const acElement = this.autocomplete.element;
        if (acElement) {
            acElement.classList.remove(CSS_CLASSES.AUTOCOMPLETE_SHOW);
        }
    }

    /**
     * Handles keyboard navigation within the autocomplete suggestions.
     * @private
     * @param {KeyboardEvent} e - The keyboard event.
     */
    _handleKeyDown(e) {
        if (!this.autocomplete.active) return;

        const { key } = e;
        if (Object.values(KEY_CODES).includes(key)) {
            e.preventDefault();
        }

        switch(key) {
            case KEY_CODES.ARROW_DOWN:
                this.autocomplete.activeIndex = (this.autocomplete.activeIndex + 1) % this.autocomplete.suggestions.length;
                this._updateActiveSuggestion();
                break;
            case KEY_CODES.ARROW_UP:
                this.autocomplete.activeIndex = (this.autocomplete.activeIndex - 1 + this.autocomplete.suggestions.length) % this.autocomplete.suggestions.length;
                this._updateActiveSuggestion();
                break;
            case KEY_CODES.ENTER:
            case KEY_CODES.TAB:
                if (this.autocomplete.activeIndex !== -1) {
                    this._selectAutocomplete(this.autocomplete.activeIndex, e.target);
                }
                break;
            case KEY_CODES.ESCAPE:
                this._hideAutocomplete();
                break;
        }
    }

    /**
     * Updates the visual highlighting of the active suggestion.
     * @private
     */
    _updateActiveSuggestion() {
        if (!this.autocomplete.element) return;

        const items = this.autocomplete.element.querySelectorAll(`.${CSS_CLASSES.AUTOCOMPLETE_ITEM}`);
        items.forEach((item, index) => {
            const isSelected = index === this.autocomplete.activeIndex;
            item.classList.toggle(CSS_CLASSES.AUTOCOMPLETE_SELECTED, isSelected);
            if (isSelected) {
                item.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
        });
    }

    /**
     * Inserts the selected suggestion into the textarea.
     * @private
     * @param {number} index - The index of the selected suggestion.
     * @param {HTMLTextAreaElement} textarea - The textarea element.
     */
    _selectAutocomplete(index, textarea) {
        const selectedTag = this.autocomplete.suggestions[index];
        const textBefore = this.content.substring(0, this.autocomplete.triggerIndex);
        const textAfter = this.content.substring(textarea.selectionStart);
        
        const newContent = `${textBefore}<${selectedTag}>${textAfter}`;
        textarea.value = newContent;
        this.content = newContent;
        
        const newCursorPos = textBefore.length + selectedTag.length + 2; // +2 for '<' and '>'
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);

        this._hideAutocomplete();
        window.blockManager.updatePreview();
    }
}

// --- BlockManagerClass ---
/**
 * Manages all prompt blocks, including adding, removing, and rendering.
 */
class BlockManagerClass {
    constructor() {
        this.blocks = [];
        this.container = null;
        this.previewElement = null;
        this.emptyState = null;
    }

    /**
     * Initializes the manager, caching DOM elements and setting up sortable functionality.
     * @returns {boolean} True if initialization was successful, false otherwise.
     */
    init() {
        this.container = document.getElementById('blockContainer');
        this.previewElement = document.getElementById('previewCode');
        this.emptyState = document.getElementById('emptyState');
        
        if (!this.container || !this.previewElement || !this.emptyState) {
            console.error('Essential DOM elements could not be found. BlockManager initialization failed.');
            return false;
        }

        this.updateDisplay();
        this._initSortable();
        return true;
    }

    /**
     * Initializes the Sortable.js library on the container.
     * @private
     */
    _initSortable() {
        new Sortable(this.container, {
			animation: ANIMATION_DURATIONS.SORTABLE,
			handle: `.${CSS_CLASSES.BLOCK_HEADER}`,
            filter: `.${CSS_CLASSES.BLOCK_ACTIONS}`,
			onEnd: (evt) => {
                // Reorder the blocks array to match the new DOM order
				const movedItem = this.blocks.splice(evt.oldIndex, 1)[0];
				this.blocks.splice(evt.newIndex, 0, movedItem);
				this.updatePreview();
			}
		});
    }

    /**
     * Adds a new block to the editor.
     * @param {string} tagName - The XML tag name for the block.
     * @param {string} [content=''] - The initial content of the block.
     */
    addBlock(tagName, content = '') {
        const block = new PromptBlock(tagName, content);
        this.blocks.push(block);
        this._renderBlock(block);
        this.updateDisplay();
        
        // Focus the new block's textarea after a short delay to allow for rendering.
        setTimeout(() => {
            block.textarea?.focus();
        }, 100); // A small delay is often necessary.
    }

    /**
     * Removes a block from the editor with a smooth animation.
     * @param {string} blockId - The ID of the block to remove.
     */
    removeBlock(blockId) {
        const index = this.blocks.findIndex(block => block.id === blockId);
        if (index === -1) return;

        const block = this.blocks[index];
        const element = block.element;
        if (!element) return;

        // To prevent a "jump" when removing an item from a flex container with a 'gap',
        // we animate the block's height, padding, and margin simultaneously.
        // The key is animating the margin to a negative value equal to the container's gap.

        // 1. Set explicit starting values for the transition.
        const style = getComputedStyle(element);
        element.style.height = style.height;
        element.style.marginBottom = style.marginBottom;
        element.style.overflow = 'hidden';
        
        // We define the transition directly on the element to ensure it runs as expected.
        element.style.transition = `all ${ANIMATION_DURATIONS.BLOCK_HEIGHT}ms ease-in-out`;
        
        // 2. On the next frame, set the target values to trigger the animation.
        requestAnimationFrame(() => {
            element.style.height = '0px';
            element.style.paddingTop = '0px';
            element.style.paddingBottom = '0px';
            // Animate margin to -1rem to counteract the 1rem gap from the parent container.
            element.style.marginBottom = '-1rem';
            element.style.opacity = '0';
        });

        // 3. After the animation completes, remove the element from the DOM and the data array.
        setTimeout(() => {
            this.blocks.splice(index, 1);
            element.remove();
            this.updateDisplay();
        }, ANIMATION_DURATIONS.BLOCK_HEIGHT);
    }

    /**
     * Renders a single block and adds it to the container with an entry animation.
     * @private
     * @param {PromptBlock} block - The block instance to render.
     */
    _renderBlock(block) {
        const element = block.createElement();
        element.classList.add(CSS_CLASSES.BLOCK_ENTERING);
        this.container.appendChild(element);
        
        setTimeout(() => {
            element.classList.remove(CSS_CLASSES.BLOCK_ENTERING);
        }, ANIMATION_DURATIONS.BLOCK_ENTER);
    }

    /**
     * Renders all blocks currently in the manager.
     */
    renderAllBlocks() {
        this.container.innerHTML = '';
        this.blocks.forEach(block => this._renderBlock(block));
    }

    /**
     * Updates the display to show either the blocks or the empty state message.
     */
    updateDisplay() {
        const hasBlocks = this.blocks.length > 0;
        this.emptyState.style.display = hasBlocks ? 'none' : 'block';
        this.container.style.display = hasBlocks ? 'flex' : 'none';
        this.updatePreview();
    }

    /**
     * Updates the XML preview with the current content of all blocks.
     */
    updatePreview() {
        const xmlOutput = this.generateXML();
        this.previewElement.textContent = xmlOutput;
    }

    /**
     * Generates the complete XML string from all blocks.
     * @returns {string} The combined XML string.
     */
    generateXML() {
        if (this.blocks.length === 0) return '';
        return this.blocks.map(block => block.toXML()).join('\n\n');
    }

    /**
     * Clears all blocks from the editor.
     * @param {boolean} [confirmNeeded=true] - If true, asks the user for confirmation before clearing.
     */
    clearProject(confirmNeeded = true) {
        if (confirmNeeded && this.blocks.length > 0 && !confirm(i18n.t('confirm_clear_all'))) {
            return;
        }
        this.blocks = [];
        this.container.innerHTML = '';
        this.updateDisplay();
    }

    /**
     * Imports blocks from an XML string.
     * @param {string} xmlText - The XML string to import.
     * @param {'append'|'replace'} [option='append'] - Whether to append to or replace existing blocks.
     * @returns {number} The number of blocks successfully imported.
     */
    importFromXML(xmlText, option = 'append') {
        // Corrected regex: Use a backreference (\1) to match the opening tag.
        const regex = /<([a-zA-Z0-9_\-]+)>([\s\S]*?)<\/\1>/g;
        const blocksData = [];
        let match;

        while ((match = regex.exec(xmlText)) !== null) {
            blocksData.push({
                tagName: match[1].trim(),
                content: match[2].trim()
            });
        }

        if (blocksData.length === 0) {
            return 0;
        }

        if (option === 'replace') {
            this.clearProject(false);
        }

        blocksData.forEach(data => {
            this.addBlock(data.tagName, data.content);
        });

        return blocksData.length;
    }

    /**
     * Gets a list of unique tag names currently used in the editor.
     * @returns {string[]} An array of unique tag names.
     */
    getUsedTags() {
        const tags = this.blocks.map(block => block.tagName);
        return [...new Set(tags)];
    }
}

/**
 * Displays a short-lived notification message.
 * @param {string} message - The message to display.
 * @param {'info'|'success'|'error'} [type='info'] - The type of notification.
 */
function showNotification(message, type = 'info') {
    // Remove any existing notification to prevent overlap.
    const existingNotification = document.querySelector(`.${CSS_CLASSES.NOTIFICATION_CAPSULE}`);
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `${CSS_CLASSES.NOTIFICATION_CAPSULE} ${type}`;

    const ICONS = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-times-circle"></i>',
        info: '' // Or a default info icon
    };

    notification.innerHTML = `${ICONS[type] || ''} <span>${message}</span>`;

    document.body.appendChild(notification);
    
    // Force a reflow before adding the 'show' class to trigger the transition.
    void notification.offsetWidth; 
    
    notification.classList.add(CSS_CLASSES.AUTOCOMPLETE_SHOW);

    setTimeout(() => {
        notification.classList.remove(CSS_CLASSES.AUTOCOMPLETE_SHOW);
        
        // Remove the element from the DOM after the fade-out transition completes.
        notification.addEventListener('transitionend', () => {
            notification.remove();
        });
    }, ANIMATION_DURATIONS.NOTIFICATION_FADEOUT);
}
