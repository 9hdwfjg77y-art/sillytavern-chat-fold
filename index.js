(() => {
    'use strict';

    // Защита от повторной загрузки.
    if (window.__stChatFoldLoaded) return;
    window.__stChatFoldLoaded = true;

    const STORAGE_KEY = 'st-chat-fold-auto-v1';
    const states = new WeakMap();

    let autoFold = false;

    try {
        autoFold = localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
        // Если хранилище недоступно, работаем без сохранения настройки.
    }

    function makeButton(label, onClick) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'stcf-button';
        button.textContent = label;

        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            onClick();
        });

        return button;
    }

    function paint(mes, state) {
        // При редактировании сообщение остаётся развёрнутым.
        const editing = Boolean(mes.querySelector('textarea'));

        if (editing) state.collapsed = false;

        const collapsed = state.collapsed;
        const label = collapsed ? '▸ Развернуть' : '▾ Свернуть';
        const expanded = String(!collapsed);

        if (mes.classList.contains('stcf-collapsed') !== collapsed) {
            mes.classList.toggle('stcf-collapsed', collapsed);
        }

        if (state.button.textContent !== label) {
            state.button.textContent = label;
        }

        if (state.button.getAttribute('aria-expanded') !== expanded) {
            state.button.setAttribute('aria-expanded', expanded);
        }

        state.button.disabled = editing;
    }

    function enhance(mes) {
        const text = mes.querySelector('.mes_text');
        if (!text) return null;

        let state = states.get(mes);

        if (!state) {
            state = {
                collapsed: autoFold,
                button: null,
            };

            states.set(mes, state);
        }

        // Восстанавливаем кнопку после перерисовки сообщения.
        if (!state.button || !mes.contains(state.button)) {
            mes.querySelectorAll('.stcf-toggle').forEach((el) => {
                el.remove();
            });

            state.button = makeButton('', () => {
                state.collapsed = !state.collapsed;
                paint(mes, state);
            });

            state.button.classList.add('stcf-toggle');
            text.before(state.button);
        }

        paint(mes, state);
        return state;
    }

    function start() {
        const chat = document.getElementById('chat');

        // Ждём, если интерфейс ещё не готов.
        if (!chat || !chat.parentElement) {
            setTimeout(start, 500);
            return;
        }

        function setAll(collapsed) {
            chat.querySelectorAll('.mes').forEach((mes) => {
                const state = enhance(mes);
                if (!state) return;

                state.collapsed = collapsed;
                paint(mes, state);
            });
        }

        const toolbar = document.createElement('div');
        toolbar.id = 'stcf-toolbar';
        toolbar.setAttribute('role', 'group');
        toolbar.setAttribute('aria-label', 'Сворачивание сообщений');

        const collapseAll = makeButton('Свернуть всё', () => {
            setAll(true);
        });

        const expandAll = makeButton('Развернуть всё', () => {
            setAll(false);
        });

        const autoLabel = document.createElement('label');
        autoLabel.className = 'stcf-auto';

        const autoInput = document.createElement('input');
        autoInput.type = 'checkbox';
        autoInput.checked = autoFold;

        autoInput.addEventListener('change', () => {
            autoFold = autoInput.checked;

            try {
                localStorage.setItem(STORAGE_KEY, String(autoFold));
            } catch {
                // Не мешаем работе, если сохранение запрещено.
            }
        });

        autoLabel.append(
            autoInput,
            document.createTextNode('Автосворачивание'),
        );

        autoLabel.title =
            'Сворачивать новые и заново загружаемые сообщения. ' +
            'Для текущих сообщений используй «Свернуть всё».';

        toolbar.append(collapseAll, expandAll, autoLabel);

        // Панель находится вне списка сообщений.
        chat.before(toolbar);

        function refresh() {
            chat.querySelectorAll('.mes').forEach(enhance);
        }

        // Группируем изменения, чтобы не обрабатывать каждый токен отдельно.
        let refreshTimer = null;

        const observer = new MutationObserver(() => {
            if (refreshTimer !== null) return;

            refreshTimer = setTimeout(() => {
                refreshTimer = null;
                refresh();
            }, 100);
        });

        observer.observe(chat, {
            childList: true,
            subtree: true,
        });

        refresh();
    }

    start();
})();
