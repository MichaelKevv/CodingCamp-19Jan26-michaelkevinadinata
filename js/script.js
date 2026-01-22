document.addEventListener('DOMContentLoaded', () => {
    const todoInput = document.getElementById('todo-input');
    const todoDate = document.getElementById('todo-date');
    const todoButton = document.querySelector('.add-btn');
    const todoList = document.getElementById('todo-list');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('search-input');
    const deleteAllBtn = document.getElementById('delete-all-btn');

    // Edit State Variables
    let editMode = false;
    let editId = null;

    todoButton.addEventListener('click', addTodo);
    todoList.addEventListener('click', deleteCheck);
    
    if(searchInput) {
        searchInput.addEventListener('input', () => filterOption());
    }
    
    if(deleteAllBtn) {
        deleteAllBtn.addEventListener('click', deleteAll);
    }
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filterOption();
        });
    });

    loadTodos();
    updateEmptyState();
    updateStats();

    function addTodo(event) {
        event.preventDefault();

        const taskText = todoInput.value.trim();
        const taskDate = todoDate.value;

        if (taskText === '') {
            shakeInput(todoInput);
            return;
        }
        if (taskDate === '') {
            shakeInput(todoDate);
            return;
        }

        if (editMode && editId) {
            // Updating existing task
            updateLocalTodo(editId, taskText, taskDate);
            resetEditMode();
        } else {
            // Adding new task
            const todoObject = {
                id: Date.now(),
                text: taskText,
                date: taskDate,
                completed: false
            };
            saveLocalTodos(todoObject);
        }

        // Reload to show changes (sorted)
        loadTodos();

        todoInput.value = '';
        todoDate.value = '';

        updateEmptyState();
        updateStats();
        filterOption();
    }

    function createTodoElement(todoObject) {
        const todoDiv = document.createElement('li');
        todoDiv.classList.add('todo-item');
        if(todoObject.completed) {
            todoDiv.classList.add('completed');
        }
        todoDiv.setAttribute('data-id', todoObject.id);
        todoDiv.setAttribute('data-date', todoObject.date);

        const todoContent = document.createElement('div');
        todoContent.classList.add('todo-content');

        const completedButton = document.createElement('button');
        completedButton.innerHTML = '<i class="fas fa-check"></i>';
        completedButton.classList.add('check-btn');
        todoContent.appendChild(completedButton);

        const infoDiv = document.createElement('div');
        infoDiv.classList.add('todo-info');

        const newTodo = document.createElement('span');
        newTodo.innerText = todoObject.text;
        newTodo.classList.add('todo-text');
        infoDiv.appendChild(newTodo);

        const dateDisplay = document.createElement('span');
        dateDisplay.innerText = formatDate(todoObject.date);
        dateDisplay.classList.add('todo-date');
        infoDiv.appendChild(dateDisplay);

        todoContent.appendChild(infoDiv);
        todoDiv.appendChild(todoContent);

        // Edit Button
        const editButton = document.createElement('button');
        editButton.innerHTML = '<i class="fas fa-pen"></i>';
        editButton.classList.add('edit-btn');
        todoDiv.appendChild(editButton);

        // Delete Button
        const trashButton = document.createElement('button');
        trashButton.innerHTML = '<i class="fas fa-trash"></i>';
        trashButton.classList.add('delete-btn');
        todoDiv.appendChild(trashButton);

        todoList.appendChild(todoDiv);
    }

    function deleteCheck(e) {
        const item = e.target;
        const todo = item.closest('.todo-item'); 

        if (!todo) return;

        // DELETE
        if (item.classList.contains('delete-btn') || item.closest('.delete-btn')) {
            todo.classList.add('fall');
            const id = todo.getAttribute('data-id');
            removeLocalTodos(id);
            todo.addEventListener('transitionend', function() {
                todo.remove();
                
                // If we were editing this item, cancel edit
                if(editMode && editId == id) {
                    resetEditMode();
                }

                updateEmptyState();
                updateStats();
            });
        }

        // EDIT
        if (item.classList.contains('edit-btn') || item.closest('.edit-btn')) {
            const id = todo.getAttribute('data-id');
            const todos = getLocalTodos();
            const taskToEdit = todos.find(t => t.id == id);
            
            if (taskToEdit) {
                // Populate Inputs
                todoInput.value = taskToEdit.text;
                todoDate.value = taskToEdit.date;
                
                // Set Edit Mode
                editMode = true;
                editId = id;
                
                // Change Add Button to Update
                todoButton.innerHTML = '<i class="fas fa-save"></i>';
                todoButton.style.background = "#0ea5e9"; // Sky blue for update
                
                // Focus input
                todoInput.focus();
                
                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }

        // CHECK / COMPLETE
        if (item.classList.contains('check-btn') || item.closest('.check-btn')) {
            const dateAttr = todo.getAttribute('data-date');
            
            const taskDate = new Date(dateAttr);
            const today = new Date();
            taskDate.setHours(0,0,0,0);
            today.setHours(0,0,0,0);

            if (!todo.classList.contains('completed')) {
                if (taskDate > today) {
                    if (!confirm('This task is scheduled for the future. Are you sure you have finished it?')) {
                        return;
                    }
                } else if (taskDate < today) {
                    if (!confirm('This task is overdue. Are you sure you have finished it?')) {
                        return;
                    }
                }
            }

            todo.classList.toggle('completed');
            const id = todo.getAttribute('data-id');
            const isCompleted = todo.classList.contains('completed');
            updateLocalStatus(id, isCompleted);
            
            updateStats();
            filterOption();
        }
    }

    function resetEditMode() {
        editMode = false;
        editId = null;
        todoButton.innerHTML = '<i class="fas fa-plus"></i>';
        todoButton.style.background = ""; // Revert to CSS default
        todoInput.value = '';
        todoDate.value = '';
    }

    function deleteAll() {
        const todos = document.querySelectorAll('.todo-item');
        if(todos.length === 0) return;

        if(confirm('Are you sure you want to delete all tasks?')) {
            todos.forEach(todo => {
                todo.classList.add('fall');
                todo.addEventListener('transitionend', function() {
                    todo.remove();
                    updateEmptyState();
                    updateStats();
                });
            });
            clearLocalTodos();
            resetEditMode();
            setTimeout(updateStats, 500); 
        }
    }

    function filterOption() {
        const todos = todoList.childNodes;
        const activeFilterBtn = document.querySelector('.filter-btn.active');
        const filterType = activeFilterBtn ? activeFilterBtn.dataset.filter : 'all';
        const searchText = searchInput ? searchInput.value.toLowerCase() : '';

        todos.forEach(function(todo) {
            if (todo.nodeType !== 1 || todo.classList.contains('empty-state')) return;

            const todoText = todo.querySelector('.todo-text').innerText.toLowerCase();
            const matchesSearch = todoText.includes(searchText);
            let matchesFilter = false;

            switch (filterType) {
                case 'all':
                    matchesFilter = true;
                    break;
                case 'completed':
                    if (todo.classList.contains('completed')) {
                        matchesFilter = true;
                    }
                    break;
                case 'active':
                    if (!todo.classList.contains('completed')) {
                        matchesFilter = true;
                    }
                    break;
            }

            if (matchesFilter && matchesSearch) {
                todo.style.display = 'flex';
            } else {
                todo.style.display = 'none';
            }
        });
    }

    function updateEmptyState() {
        const items = document.querySelectorAll('.todo-item');
        const emptyState = document.querySelector('.empty-state');
        if (items.length === 0) {
            emptyState.style.display = 'flex';
        } else {
            emptyState.style.display = 'none';
        }
    }

    function updateStats() {
        const totalItems = document.querySelectorAll('.todo-item');
        const completedItems = document.querySelectorAll('.todo-item.completed');
        
        const totalCount = totalItems.length;
        const completedCount = completedItems.length;
        const pendingCount = totalCount - completedCount;

        const totalEl = document.getElementById('total-tasks');
        const completedEl = document.getElementById('completed-tasks');
        const pendingEl = document.getElementById('pending-tasks');

        if(totalEl) totalEl.innerText = totalCount;
        if(completedEl) completedEl.innerText = completedCount;
        if(pendingEl) pendingEl.innerText = pendingCount;
        
        updateProgress();
    }

    function updateProgress() {
        const todos = document.querySelectorAll('.todo-item');
        const today = new Date().toISOString().slice(0, 10); 
        
        let todayTotal = 0;
        let todayCompleted = 0;

        todos.forEach(todo => {
            const dateAttr = todo.getAttribute('data-date');
            if (dateAttr === today) {
                todayTotal++;
                if (todo.classList.contains('completed')) {
                    todayCompleted++;
                }
            }
        });

        let percent = 0;
        if (todayTotal > 0) {
            percent = Math.round((todayCompleted / todayTotal) * 100);
        }

        const percentEl = document.getElementById('daily-percent');
        const barEl = document.getElementById('daily-progress-bar');
        
        if(percentEl) percentEl.innerText = percent + '%';
        if(barEl) barEl.style.width = percent + '%';
    }

    function shakeInput(input) {
        input.style.border = "1px solid #ef4444";
        input.animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(0)' }
        ], {
            duration: 300
        });
        setTimeout(() => {
            input.style.border = "none";
        }, 3000);
    }

    function formatDate(dateString) {
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    }

    function saveLocalTodos(todoObject) {
         let todos = getLocalTodos();
         todos.push(todoObject);
         sortAndSave(todos);
    }
 
    function updateLocalTodo(id, newText, newDate) {
        let todos = getLocalTodos();
        const index = todos.findIndex(t => t.id == id);
        if (index > -1) {
            todos[index].text = newText;
            todos[index].date = newDate;
            sortAndSave(todos);
        }
    }

    function getLocalTodos() {
        if (localStorage.getItem('todos_app_web_mkevina') === null) {
            return [];
        } else {
            return JSON.parse(localStorage.getItem('todos_app_web_mkevina'));
        }
    }
 
    function sortAndSave(todos) {
        todos.sort((a, b) => new Date(a.date) - new Date(b.date));
        localStorage.setItem('todos_app_web_mkevina', JSON.stringify(todos));
    }
 
    function loadTodos() {
        let todos = getLocalTodos();
        todos.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const todoList = document.getElementById('todo-list');
        const items = document.querySelectorAll('.todo-item');
        items.forEach(item => item.remove());
 
        todos.forEach(function(todo) {
            createTodoElement(todo);
        });
    }
 
    function removeLocalTodos(id) {
        let todos = getLocalTodos();
        const todoIndex = todos.findIndex(todo => todo.id == id);
        if(todoIndex > -1) {
            todos.splice(todoIndex, 1);
        }
        localStorage.setItem('todos_app_web_mkevina', JSON.stringify(todos));
    }
 
    function updateLocalStatus(id, status) {
        let todos = getLocalTodos();
        const todoIndex = todos.findIndex(todo => todo.id == id);
        if(todoIndex > -1) {
            todos[todoIndex].completed = status;
        }
        localStorage.setItem('todos_app_web_mkevina', JSON.stringify(todos));
    }
 
    function clearLocalTodos() {
        localStorage.removeItem('todos_app_web_mkevina');
    }
});
