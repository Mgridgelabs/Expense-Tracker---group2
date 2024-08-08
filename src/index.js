document.addEventListener('DOMContentLoaded', () => {
    // Get Elements from the HTML
    const addExpenseForm = document.getElementById('addExpenseForm');
    const deleteButton = document.getElementById('deleteButton');
    const sortOptions = document.querySelectorAll('#sortButton + .dropdown-menu a');
    const expenseChart = document.getElementById('expenseChart').getContext('2d');
    const myMonthlyBudget = document.getElementById('monthlyBudget');
    const remainingBudgetDisplay = document.getElementById('remainingBudget');
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    const budgetForm = document.getElementById('budgetForm');
    const logoutButton = document.getElementById('logoutButton');

    let loggedInUserId = null;
    let selectedExpenses = [];
    let expenses = [];
    let monthlyBudget = 20000;

    function isLoggedIn() {
        return loggedInUserId !== null;
    }

    function checkLoggedInStatus() {
        const storedUserId = localStorage.getItem('loggedInUserId');
        if (storedUserId) {
            loggedInUserId = parseInt(storedUserId, 10);
            fetchExpenses();
        }
    }

    function logout() {
        localStorage.removeItem('loggedInUserId');
        loggedInUserId = null;
        expenses = [];
        displayExpenses();
        updateSummary();
        updateChart();
        alert('Logged out successfully');
    }

    logoutButton.addEventListener('click', logout);

    // Register User
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(registerForm);
        const userData = {
            name: formData.get('registerName'),
            email: formData.get('registerEmail'),
            password: formData.get('registerPassword')
        };

        fetch('http://localhost:3000/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        })
            .then(response => response.json())
            .then(data => {
                console.log('User registered:', data);
                alert('User registered successfully');
                registerForm.reset();
                const regModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
                regModal.hide();
            })
            .catch(error => {
                console.error('Error registering user:', error);
                alert('Error registering user');
            });
    });

    // Login User
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(loginForm);
        const name = formData.get('loginName');
        const email = formData.get('loginEmail');
        const password = formData.get('loginPassword');

        fetch('http://localhost:3000/users')
            .then(response => response.json())
            .then(users => {
                const user = users.find(user => user.name === name && user.email === email && user.password === password);
                if (user) {
                    loggedInUserId = user.id;
                    localStorage.setItem('loggedInUserId', loggedInUserId);
                    console.log('Logged in successfully:', user);
                    alert('Logged in successfully');
                    loginForm.reset();
                    const logModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                    logModal.hide();
                    fetchExpenses();
                    updateSummary();
                } else {
                    alert('Invalid credentials');
                }
            })
            .catch(error => {
                console.error('Error fetching users:', error);
                alert('Error logging in');
            });
    });

    // Fetch expenses and display them
    checkLoggedInStatus();
    displayCurrentDate();

    // Add event listeners for form submissions, delete button, sort options, and budget form
    addExpenseForm.addEventListener('submit', handleSubmit);
    deleteButton.addEventListener('click', deleteSelectedExpenses);
    sortOptions.forEach(option => {
        option.addEventListener('click', (e) => sortExpenses(e.target.dataset.sort));
    });
    budgetForm.addEventListener('submit', handleSubmit);

    // Initialize the expense chart
    initializeChart();

    // Fetch expenses from server
    function fetchExpenses() {
        if (!isLoggedIn()) {
            alert('Please log in to view expenses.');
            return;
        }

        fetch(`http://localhost:3000/expenses?userId=${loggedInUserId}`)
            .then(res => res.json())
            .then(data => {
                expenses = data;
                displayExpenses();
                updateSummary();
                updateChart();
            })
            .catch(error => console.error(`Fetching Error: ${error}`));
    }

    // Calculate total expenditure and get total expenses filtered by category
    function totalExpenditure(category = null) {
        return new Promise((resolve, reject) => {
            if (!isLoggedIn()) {
                reject(new Error('User not logged in'));
                return;
            }
    
            fetch(`http://localhost:3000/expenses?userId=${loggedInUserId}`)
                .then(res => res.json())
                .then(data => {
                    let filteredExpenses = data;
                    if (category !== null) {
                        filteredExpenses = data.filter(expense => expense.category === category);
                    }
                    const total = filteredExpenses.reduce((acc, expense) => acc + parseFloat(expense.amount), 0);
                    resolve(total);
                })
                .catch(error => {
                    console.error(`Error getting total: ${error}`);
                    reject(error);
                });
        });
    }
    
    // Update summary information for total expenses for all categories for the logged-in user
    function updateSummary() {
        if (!isLoggedIn()) {
            console.log('User not logged in. Cannot update summary.');
            return;
        }
    
        totalExpenditure().then(total => {
            document.getElementById('currentExpense').textContent = `Total expense: $${total.toFixed(2)}`;
            document.getElementById('totalSum').textContent = `Total expense: $${total.toFixed(2)}`;
            calculateRemainingBudget(total);
        }).catch(error => console.error('Error updating total expenditure:', error));
    
        const categories = ['Groceries', 'Transport', 'Personal Care', 'Entertainment', 'Utilities', 'Other'];
        categories.forEach(category => {
            totalExpenditure(category).then(total => {
                document.getElementById(category.toLowerCase().replace(' ', '-')).textContent = `${category}: $${total.toFixed(2)}`;
            }).catch(error => console.error(`Error updating ${category} total:`, error));
        });
    }
    // Calculate and display the remaining budget
    function calculateRemainingBudget(totalExpenses) {
        // Function to update remaining budget
        const updateRemainingBudget = () => {
            const remainingBudget = monthlyBudget - totalExpenses;
            remainingBudgetDisplay.textContent = `Remaining Budget: $${remainingBudget.toFixed(2)}`;
        };

        // Initial fetch to get the budget from the server and set up the event listener
        fetch('http://localhost:3000/budget/1')
            .then(res => res.json())
            .then(data => {
                monthlyBudget = parseFloat(data.monthlyBudget);
                myMonthlyBudget.textContent = data.monthlyBudget;

                updateRemainingBudget();

                myMonthlyBudget.addEventListener('dblclick', () => {
                    const editBudget = document.createElement('input');
                    editBudget.type = 'number';
                    editBudget.value = myMonthlyBudget.textContent;
                    myMonthlyBudget.replaceWith(editBudget);

                    editBudget.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            const newBudget = editBudget.value.trim();
                            if (newBudget !== '' && newBudget !== myMonthlyBudget.textContent) {
                                fetch('http://localhost:3000/budget/1', {
                                    method: 'PATCH',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Accept': 'application/json'
                                    },
                                    body: JSON.stringify({ monthlyBudget: newBudget })
                                })
                                    .then(res => res.json())
                                    .then(budget => {
                                        monthlyBudget = parseFloat(budget.monthlyBudget);
                                        myMonthlyBudget.textContent = budget.monthlyBudget;
                                        updateRemainingBudget();
                                    })
                                    .catch(error => console.error(`Error updating budget: ${error}`));
                            }
                            editBudget.replaceWith(myMonthlyBudget);
                        }
                    });
                });
            })
            .catch(error => console.error(`Error fetching budget: ${error}`));
    }

    // Sort expenses based on selected option and display them
    function sortExpenses(sortOption) {
        switch (sortOption) {
            case 'dateN':
                expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'dateO':
                expenses.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;
            case 'amountL':
                expenses.sort((a, b) => a.amount - b.amount);
                break;
            case 'amountH':
                expenses.sort((a, b) => b.amount - a.amount);
                break;
            case 'category':
                expenses.sort((a, b) => a.category.localeCompare(b.category));
                break;
        }
        displayExpenses();
    }

    // Display the sort expenses in the table
    function displayExpenses() {
        const tbody = document.querySelector('table tbody');
        tbody.innerHTML = '';

        expenses.forEach(expense => {
            const row = createExpenseRow(expense);
            tbody.appendChild(row);
        });

        updateChart();
    }

    // Handle expense form submission
    function handleSubmit(event) {
        event.preventDefault();

        const categorySelect = document.getElementById('formSelect');
        const category = categorySelect.options[categorySelect.selectedIndex].text;
        const description = document.getElementById('description').value;
        const amount = document.getElementById('amount').value;
        const date = document.getElementById('date').value;

        const newExpense = {
            category,
            description,
            amount,
            date,
            userId: loggedInUserId
        };

        postExpense(newExpense);
        addExpenseForm.reset();
    }

    // Post new expense to server
    function postExpense(newExpense) {
        if (!isLoggedIn()) {
            alert('Please log in to add expenses.');
            return;
        }

        newExpense.userId = loggedInUserId;

        fetch('http://localhost:3000/expenses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(newExpense)
        })
        .then(res => res.json())
        .then(expense => {
            expenses.push(expense);
            displayExpenses();
            updateSummary();
            updateChart();
            fetchExpenses();
        })
        .catch(error => console.error(`Posting Error: ${error}`));
    }

    // Create a table row for an expense
    function createExpenseRow(expense) {
        const row = document.createElement('tr');
        row.dataset.id = expense.id;

        const checkboxCell = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.addEventListener('change', () => toggleExpenseSelection(expense.id, checkbox.checked));
        checkboxCell.appendChild(checkbox);
        row.appendChild(checkboxCell);

        ['category', 'description', 'amount', 'date'].forEach(key => {
            const cell = document.createElement('td');
            cell.textContent = expense[key];
            cell.addEventListener('dblclick', () => editCell(cell, key, expense));
            row.appendChild(cell);
        });

        return row;
    }

    // Edit a table cell
    function editCell(cell, key, expense) {
        const oldValue = cell.textContent;
        const input = document.createElement('input');
        input.type = key === 'amount' ? 'number' : key === 'date' ? 'date' : 'text';
        input.value = oldValue;

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const newValue = input.value.trim();
                if (newValue !== oldValue) {
                    updateExpense(expense.id, { [key]: newValue });
                } else {
                    cell.textContent = newValue;
                    input.replaceWith(cell);
                }
            }
        });

        cell.textContent = '';
        cell.appendChild(input);
        input.focus();
    }

    // Update an expense on the server once editing takes place
    function updateExpense(expenseId, updates) {
        if (!isLoggedIn()) {
            alert('Please log in to update expenses.');
            return;
        }

        fetch(`http://localhost:3000/expenses/${expenseId}?userId=${loggedInUserId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(updates)
        })
            .then(res => res.json())
            .then(updatedExpense => {
                const index = expenses.findIndex(expense => expense.id === updatedExpense.id);
                if (index !== -1) {
                    expenses[index] = updatedExpense;
                    displayExpenses();
                    updateSummary();
                     fetchExpenses();
                }
            })
            .catch(error => console.error(`Error updating expense: ${error}`));
    }

    // Toggle the selection of an expense in order to delete entry
    function toggleExpenseSelection(expenseId, isSelected) {
        if (isSelected) {
            selectedExpenses.push(expenseId);
        } else {
            const index = selectedExpenses.indexOf(expenseId);
            if (index !== -1) {
                selectedExpenses.splice(index, 1);
            }
        }
        deleteButton.disabled = selectedExpenses.length === 0;
    }

    // Delete selected expenses
    function deleteSelectedExpenses() {
        selectedExpenses.forEach(expenseId => {
            deleteExpense(expenseId);
        });
        selectedExpenses = [];
        deleteButton.disabled = true;
    }

    // Update server when an entry is deleted by user
    function deleteExpense(expenseId) {
        if (!isLoggedIn()) {
            alert('Please log in to delete expenses.');
            return;
        }

        fetch(`http://localhost:3000/expenses/${expenseId}?userId=${loggedInUserId}`, {
            method: 'DELETE'
        })
            .then(() => {
                expenses = expenses.filter(expense => expense.id !== expenseId);
                displayExpenses();
                updateSummary();
                 fetchExpenses();
            })
            .catch(error => console.error(`Error deleting expense: ${error}`));
    }

    // Display the current date
    function displayCurrentDate() {
        const currentDate = document.getElementById('currentDate');
        const date = new Date();
        const formattedDate = new Intl.DateTimeFormat('en-US').format(date);
        currentDate.textContent = `Date: ${formattedDate}`;
    }

    // Initialize the expense chart. Sections of the pie chart initialization
    function initializeChart() {
        const categories = ['Groceries', 'Transport', 'Personal Care', 'Entertainment', 'Utilities', 'Other'];
        /*calculate the total amounts for each expense category by filtering 
        the expenses and then reducing them to get the sum*/
        const amounts = categories.map(category =>
            expenses.filter(expense => expense.category === category)
                .reduce((total, expense) => total + parseFloat(expense.amount), 0)
        );

        const chart = new Chart(expenseChart, {
            type: 'pie',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Total Expenses by Category',
                    data: amounts,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Total Expenses by Category'
                    }
                }
            }
        });
    }

    // Update the expense chart
    function updateChart() {
        const categories = ['Groceries', 'Transport', 'Personal Care', 'Entertainment', 'Utilities', 'Other'];
        const amounts = categories.map(category =>
            expenses.filter(expense => expense.category === category)
                .reduce((total, expense) => total + parseFloat(expense.amount), 0)
        );

        const chart = new Chart(expenseChart, {
            type: 'pie',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Total Expenses by Category',
                    data: amounts,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Total Expenses by Category'
                    }
                }
            }
        });
    }
});