from flask import Flask, render_template, jsonify, request
import sudoku_logic

app = Flask(__name__)

# Keep a simple in-memory store for current puzzle and solution
CURRENT: dict[str, list[list[int]] | None] = {
    'puzzle': None,
    'solution': None
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/new', methods=['GET', 'POST'])
def new_game():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        data = {}
    difficulty = request.args.get('difficulty', data.get('difficulty', 'medium'))
    if difficulty not in sudoku_logic.DIFFICULTIES:
        return jsonify({'error': 'Invalid difficulty'}), 400

    clues = sudoku_logic.DIFFICULTIES[difficulty]
    puzzle, solution = sudoku_logic.generate_puzzle(clues)
    CURRENT['puzzle'] = puzzle
    CURRENT['solution'] = solution
    return jsonify({'puzzle': puzzle})

@app.route('/check', methods=['POST'])
def check_solution():
    data = request.get_json(silent=True)
    board = data.get('board') if isinstance(data, dict) else None
    solution = CURRENT.get('solution')
    if solution is None:
        return jsonify({'error': 'No game in progress'}), 400
    if (
        not isinstance(board, list)
        or len(board) != sudoku_logic.SIZE
        or any(
            not isinstance(row, list)
            or len(row) != sudoku_logic.SIZE
            or any(
                not isinstance(value, int) or not 0 <= value <= sudoku_logic.SIZE
                for value in row
            )
            for row in board
        )
    ):
        return jsonify({'error': 'Invalid board'}), 400

    incorrect = []
    for i in range(sudoku_logic.SIZE):
        for j in range(sudoku_logic.SIZE):
            if board[i][j] != solution[i][j]:
                incorrect.append([i, j])
    return jsonify({'incorrect': incorrect})

@app.route('/hint', methods=['POST'])
def get_hint():
    data = request.get_json(silent=True)
    board = data.get('board') if isinstance(data, dict) else None
    solution = CURRENT.get('solution')
    if solution is None:
        return jsonify({'error': 'No game in progress'}), 400
    if (
        not isinstance(board, list)
        or len(board) != sudoku_logic.SIZE
        or any(
            not isinstance(row, list)
            or len(row) != sudoku_logic.SIZE
            or any(
                not isinstance(value, int) or not 0 <= value <= sudoku_logic.SIZE
                for value in row
            )
            for row in board
        )
    ):
        return jsonify({'error': 'Invalid board'}), 400

    for row in range(sudoku_logic.SIZE):
        for column in range(sudoku_logic.SIZE):
            if board[row][column] != solution[row][column]:
                return jsonify({
                    'row': row,
                    'column': column,
                    'value': solution[row][column],
                })
    return jsonify({'error': 'No hint available'}), 400

if __name__ == '__main__':
    app.run(debug=True)