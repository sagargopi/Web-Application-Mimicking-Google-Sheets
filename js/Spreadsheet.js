class Spreadsheet {
    constructor(container, rows = 100, cols = 26) {
        this.container = document.getElementById(container);
        this.rows = rows;
        this.cols = cols;
        this.cells = {};
        this.selectedCell = null;
        this.init();
    }

    init() {
        this.createGrid();
        this.setupEventListeners();
        this.initFormulaBar();
        this.initFunctionDropdown();
        this.selectCellAt(0, 0); // Select first cell by default
    }

    createGrid() {
        const table = document.createElement('table');
        table.className = 'spreadsheet-table';
        const tbody = document.createElement('tbody');

        // Create column headers
        const headerRow = document.createElement('tr');
        const cornerCell = document.createElement('th');
        cornerCell.className = 'corner-header';
        headerRow.appendChild(cornerCell);

        for (let col = 0; col < this.cols; col++) {
            const th = document.createElement('th');
            th.className = 'header-cell';
            th.textContent = String.fromCharCode(65 + col);
            headerRow.appendChild(th);
        }
        tbody.appendChild(headerRow);

        // Create rows and cells
        for (let row = 0; row < this.rows; row++) {
            const tr = document.createElement('tr');
            
            // Row header
            const rowHeader = document.createElement('th');
            rowHeader.className = 'header-cell';
            rowHeader.textContent = row + 1;
            tr.appendChild(rowHeader);

            // Cells
            for (let col = 0; col < this.cols; col++) {
                const td = document.createElement('td');
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.contentEditable = true;
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.dataset.formula = '';
                td.appendChild(cell);
                tr.appendChild(td);
                this.cells[`${row},${col}`] = cell;
            }
            tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        this.container.appendChild(table);
    }

    setupEventListeners() {
        // Cell selection
        this.container.addEventListener('click', (e) => {
            const cell = e.target.closest('.cell');
            if (cell) {
                this.selectCell(cell);
            }
        });

        // Cell content changes
        this.container.addEventListener('input', (e) => {
            const cell = e.target.closest('.cell');
            if (cell) {
                this.updateFormulaBar(cell);
            }
        });

        // Handle cell keydown events
        this.container.addEventListener('keydown', (e) => {
            const cell = e.target.closest('.cell');
            if (!cell) return;

            if (e.key === 'Enter') {
                e.preventDefault();
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                this.evaluateCell(cell);
                if (row < this.rows - 1) {
                    this.selectCellAt(row + 1, col);
                }
            } else if (e.key === 'Tab') {
                e.preventDefault();
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                this.evaluateCell(cell);
                if (col < this.cols - 1) {
                    this.selectCellAt(row, col + 1);
                } else if (row < this.rows - 1) {
                    this.selectCellAt(row + 1, 0);
                }
            } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                this.evaluateCell(cell);

                switch (e.key) {
                    case 'ArrowUp':
                        if (row > 0) this.selectCellAt(row - 1, col);
                        break;
                    case 'ArrowDown':
                        if (row < this.rows - 1) this.selectCellAt(row + 1, col);
                        break;
                    case 'ArrowLeft':
                        if (col > 0) this.selectCellAt(row, col - 1);
                        break;
                    case 'ArrowRight':
                        if (col < this.cols - 1) this.selectCellAt(row, col + 1);
                        break;
                }
            }
        });
    }

    initFormulaBar() {
        const formulaInput = document.getElementById('formula-input');
        
        formulaInput.addEventListener('input', (e) => {
            if (this.selectedCell) {
                this.selectedCell.textContent = e.target.value;
            }
        });

        formulaInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (this.selectedCell) {
                    const value = formulaInput.value;
                    this.selectedCell.textContent = value;
                    this.evaluateCell(this.selectedCell);
                    this.selectedCell.focus();
                }
            }
        });
    }

    initFunctionDropdown() {
        const functionSelect = document.getElementById('function-select');
        
        // Add functions to dropdown
        const functions = Formula.getFunctionList();
        functions.forEach(func => {
            const option = document.createElement('option');
            option.value = func;
            option.textContent = func;
            functionSelect.appendChild(option);
        });

        // Handle function selection
        functionSelect.addEventListener('change', () => {
            if (this.selectedCell && functionSelect.value) {
                const formulaInput = document.getElementById('formula-input');
                formulaInput.value = `=${functionSelect.value}()`;
                formulaInput.focus();
                
                // Place cursor between parentheses
                const pos = formulaInput.value.length - 1;
                formulaInput.setSelectionRange(pos, pos);
            }
        });
    }

    selectCell(cell) {
        if (this.selectedCell) {
            this.selectedCell.classList.remove('selected');
        }
        this.selectedCell = cell;
        cell.classList.add('selected');
        this.updateFormulaBar(cell);
        
        // Update selected cell display
        const col = String.fromCharCode(65 + parseInt(cell.dataset.col));
        const row = parseInt(cell.dataset.row) + 1;
        document.querySelector('.selected-cell').textContent = `${col}${row}`;
    }

    selectCellAt(row, col) {
        const cell = this.cells[`${row},${col}`];
        if (cell) {
            this.selectCell(cell);
            cell.focus();
            
            // Place cursor at end of text
            const range = document.createRange();
            range.selectNodeContents(cell);
            range.collapse(false);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    updateFormulaBar(cell) {
        const formulaInput = document.getElementById('formula-input');
        formulaInput.value = cell.dataset.formula || cell.textContent;
    }

    evaluateCell(cell) {
        const value = cell.textContent;
        if (value.startsWith('=')) {
            try {
                cell.dataset.formula = value;
                const result = Formula.evaluateFormula(value, (row, col) => {
                    const targetCell = this.cells[`${row},${col}`];
                    return targetCell ? targetCell.textContent : '';
                });
                cell.textContent = result;
            } catch (e) {
                cell.textContent = '#ERROR!';
            }
        } else {
            cell.dataset.formula = value;
        }
    }

    getCellValue(row, col) {
        const cell = this.cells[`${row},${col}`];
        return cell ? cell.textContent : '';
    }
}
