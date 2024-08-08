document.addEventListener('DOMContentLoaded', () => {
    const recordsButton = document.getElementById('recordsButton');
    const modal = new bootstrap.Modal(document.getElementById('recordsModal'));
    const recordsContent = document.getElementById('recordsContent');
    const summaryDropdownMenu = document.getElementById('summaryDropdownMenu');
  
    // When the user clicks the button, open the modal
    recordsButton.addEventListener('click', () => {
        modal.show();
        fetchMonthsSummary();
    });

    // Fetch and display the summary of records based on different months
    function fetchMonthsSummary() {
        fetch('http://localhost:3000/expenses')
            .then(res => res.json())
            .then(data => {
                const months = getMonths(data);
                populateSummaryDropdown(months);
            })
            .catch(error => console.error(`Fetching Error: ${error}`));
    }

    // Get unique months from records
    function getMonths(records) {
        const months = records.map(record => {
            const date = new Date(record.date);
            return date.toLocaleString('default', { month: 'long', year: 'numeric' });
        });
        return [...new Set(months)]; // Get unique months
    }

    // Populate the summary dropdown menu
    function populateSummaryDropdown(months) {
        summaryDropdownMenu.innerHTML = '';
        months.forEach(month => {
            const summaryItem = document.createElement('li');
            const link = document.createElement('a');
            link.classList.add('dropdown-item');
            link.href = '#';
            link.textContent = month;
            link.addEventListener('click', () => fetchRecordsForMonth(month));
            summaryItem.appendChild(link);
            summaryDropdownMenu.appendChild(summaryItem);
        });
    }

    // Fetch and display records for a specific month
    function fetchRecordsForMonth(month) {
        fetch('http://localhost:3000/expenses')
            .then(res => res.json())
            .then(data => {
                const filteredRecords = data.filter(record => {
                    const recordDate = new Date(record.date);
                    const recordMonth = recordDate.toLocaleString('default', { month: 'long', year: 'numeric' });
                    return recordMonth === month;
                });
                displayRecords(filteredRecords);
            })
            .catch(error => console.error(`Fetching Error: ${error}`));
    }

    // Display records in the modal
    function displayRecords(records) {
        recordsContent.innerHTML = '';
        if (records.length === 0) {
            recordsContent.textContent = 'No records found for this month.';
        } else {
            records.forEach(record => {
                const recordItem = document.createElement('div');
                recordItem.textContent = `Category: ${record.category}, Amount: $${record.amount}, Date: ${record.date}`;
                recordsContent.appendChild(recordItem);
            });
        }
    }
});
