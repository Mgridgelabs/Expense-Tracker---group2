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
    const budgetForm = document.getElementById('budgetForm'); // Added this line

    let loggedInUserId = null;
    let selectedExpenses = [];
    let expenses = [];
    let monthlyBudget = 20000;

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
        if (loggedInUserId) {
            alert('You are already logged in.');
            return;
        }
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
                    console.log('Logged in successfully:', user);
                    alert('Logged in successfully');
                    loginForm.reset();
                    const logModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                    logModal.hide();
                    fetchExpenses(); 
                    // Disable login form after successful login
                    loginForm.querySelector('button[type="submit"]').disabled = true;
                    loginForm.querySelector('input').disabled = true;
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
    function fetchExpenses() {
        if (loggedInUserId === null) {
            alert('Please log in to view expenses.');
            return;
        }
    
        fetch(`http://localhost:3000/expenses?userId=${loggedInUserId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                expenses = data; // Store the fetched data
                console.log('Expenses fetched:', expenses); // Debugging output
                displayExpenses(); // Display expenses
                updateSummary(); // Update summary
                updateChart(); // Update chart with latest data
            })
            .catch(error => {
                console.error('Error fetching expenses:', error);
                alert('Error fetching expenses. Check console for details.');
            });
    }
    
    // Display expenses in the table
    function displayExpenses(expensesToDisplay = expenses) {
        const expenseTableBody = document.getElementById('expenseTableBody');
        if (expenseTableBody) {
            expenseTableBody.innerHTML = '';
            if (expensesToDisplay.length === 0) {
                expenseTableBody.innerHTML = '<tr><td colspan="5">No expenses to display</td></tr>';
            } else {
                expensesToDisplay.forEach(expense => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><input type="checkbox" data-id="${expense.id}" class="expense-checkbox"></td>
                        <td>${expense.category}</td>
                        <td>${parseFloat(expense.amount).toFixed(2)}</td>
                        <td>${expense.date}</td>
                        <td>${expense.description}</td>
                    `;
                    expenseTableBody.appendChild(row);
                });
    
                // Add event listeners for checkboxes
                document.querySelectorAll('.expense-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', handleCheckboxChange);
                });
            }
        } else {
            console.error('Expense table body element not found.');
        }
    }
    // Handle checkbox selection and enable delete button if at least one expense is selected
    function handleCheckboxChange() {
        const checkedCheckboxes = document.querySelectorAll('.expense-checkbox:checked');
        selectedExpenses = Array.from(checkedCheckboxes).map(checkbox => checkbox.dataset.id);
        deleteButton.disabled = selectedExpenses.length === 0;
    }

    // Delete selected expenses
    function deleteSelectedExpenses() {
        if (selectedExpenses.length === 0) {
            alert('No expenses selected for deletion.');
            return;
        }

        selectedExpenses.forEach(id => {
            fetch(`http://localhost:3000/expenses/${id}`, {
                method: 'DELETE'
            })
                .then(response => response.json())
                .then(() => {
                    console.log('Expense deleted:', id);
                    fetchExpenses(); // Refresh expenses list after deletion
                })
                .catch(error => console.error('Error deleting expense:', error));
        });
    }

    budgetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newBudget = parseFloat(document.getElementById('monthlyBudgetInput').value);
    
        // Your logic to update the budget
        fetch('http://localhost:3000/budget/1', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ monthlyBudget: newBudget }),
        })
        .then(response => response.json())
        .then(data => {
            console.log('Budget updated:', data);
            // Update UI accordingly
            myMonthlyBudget.textContent = newBudget;
            updateSummary(); // Update the summary to reflect the new budget
        })
        .catch(error => console.error('Error updating budget:', error));
    });
    
    // Handle form submission for adding expenses
    function handleSubmit(e) {
        e.preventDefault();
        const formData = new FormData(addExpenseForm);
        const newExpense = {
            userId: loggedInUserId,
            category: formData.get('category'),
            amount: parseFloat(formData.get('amount')),
            date: formData.get('date'),
            description: formData.get('description')
        };

        fetch('http://localhost:3000/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newExpense),
        })
            .then(response => response.json())
            .then(expense => {
                console.log('New expense added:', expense);
                alert('Expense added successfully');
                addExpenseForm.reset();
                fetchExpenses(); // Refresh expenses list after adding a new expense
            })
            .catch(error => {
                console.error('Error adding expense:', error);
                alert('Error adding expense');
            });
    }

    // Update summary information for total expenses
    function updateSummary() {
        totalExpenditure().then(total => {
            document.getElementById('currentExpense').textContent = `Total expense: $${total.toFixed(2)}`;
            document.getElementById('totalSum').textContent = `Total expense: $${total.toFixed(2)}`;
            calculateRemainingBudget(total);
        });

        ['Groceries', 'Transport', 'Personal Care', 'Entertainment', 'Utilities', 'Other'].forEach(category => {
            totalExpenditure(category).then(categoryTotal => {
                const categoryElement = document.getElementById(category.toLowerCase().replace(' ', '-') || 'other');
                if (categoryElement) {
                    categoryElement.textContent = `${category}: $${categoryTotal.toFixed(2)}`;
                } else {
                    console.error(`Element for category ${category} not found.`);
                }
            });
        });
    }

    // Calculate total expenditure for a category or all expenses
    function totalExpenditure(category = null) {
        return new Promise((resolve, reject) => {
            fetch('http://localhost:3000/expenses')
                .then(res => res.json())
                .then(data => {
                    let filteredExpenses = data;
                    if (category !== null) {
                        filteredExpenses = data.filter(expense => expense.category === category);
                    }
                    const total = filteredExpenses.reduce((acc, expense) => acc + parseFloat(expense.amount), 0);
                    resolve(total);
                })
                .catch(error => reject(error));
        });
    }

    // Calculate remaining budget
    function calculateRemainingBudget(total) {
        if (myMonthlyBudget && remainingBudgetDisplay) {
            const budget = parseFloat(myMonthlyBudget.textContent) || 0;
            const remaining = budget - total;
            remainingBudgetDisplay.textContent = `Remaining budget: $${remaining.toFixed(2)}`;
        }
    }

    // Update chart with expenses data
    function updateChart() {
        totalExpenditure().then(total => {
            new Chart(expenseChart, {
                type: 'bar',
                data: {
                    labels: ['Expenses'],
                    datasets: [{
                        label: 'Expenses',
                        data: [total],
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        });
    }

    // Sort expenses based on selected option
    sortOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            const sortBy = e.target.dataset.sort;
            const sortedExpenses = [...expenses].sort((a, b) => {
                if (sortBy === 'amount') {
                    return a.amount - b.amount;
                } else if (sortBy === 'date') {
                    return new Date(a.date) - new Date(b.date);
                } else {
                    return a[sortBy].localeCompare(b[sortBy]);
                }
            });
            displayExpenses(sortedExpenses);
        });
    });

    // Add event listener for delete button
    deleteButton.addEventListener('click', deleteSelectedExpenses);

    // Add event listener for form submission
    addExpenseForm.addEventListener('submit', handleSubmit);

    // Initial fetch for expenses if user is logged in
    if (loggedInUserId) {
        fetchExpenses();
    }
});
