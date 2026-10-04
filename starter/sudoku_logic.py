import copy
import random

SIZE = 9
EMPTY = 0
DIFFICULTIES = {
    "easy": 45,
    "medium": 35,
    "hard": 25,
}

def deep_copy(board):
    return copy.deepcopy(board)

def create_empty_board():
    return [[EMPTY for _ in range(SIZE)] for _ in range(SIZE)]

def is_safe(board, row, col, num):
    # Check row and column
    for x in range(SIZE):
        if board[row][x] == num or board[x][col] == num:
            return False
    # Check 3x3 box
    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[start_row + i][start_col + j] == num:
                return False
    return True

def count_solutions(board: list[list[int]], limit: int = 2) -> int:
    """Count solutions up to limit, restoring the board after each search."""
    if limit <= 0:
        return 0

    solutions = 0

    def search():
        nonlocal solutions
        for row in range(SIZE):
            for col in range(SIZE):
                if board[row][col] == EMPTY:
                    for candidate in range(1, SIZE + 1):
                        if is_safe(board, row, col, candidate):
                            board[row][col] = candidate
                            search()
                            board[row][col] = EMPTY
                            if solutions >= limit:
                                return
                    return
        solutions += 1

    search()
    return solutions

def fill_board(board):
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                possible = list(range(1, SIZE + 1))
                random.shuffle(possible)
                for candidate in possible:
                    if is_safe(board, row, col, candidate):
                        board[row][col] = candidate
                        if fill_board(board):
                            return True
                        board[row][col] = EMPTY
                return False
    return True

def remove_cells(board, clues):
    attempts = SIZE * SIZE - clues
    cells = [(row, col) for row in range(SIZE) for col in range(SIZE)]
    random.shuffle(cells)
    for row, col in cells:
        if attempts == 0:
            break
        value = board[row][col]
        if value != EMPTY:
            board[row][col] = EMPTY
            if count_solutions(board) != 1:
                board[row][col] = value
            else:
                attempts -= 1
    return attempts == 0

def generate_puzzle(clues=35):
    if not 17 <= clues <= SIZE * SIZE:
        raise ValueError("clues must be between 17 and 81")

    for _ in range(100):
        board = create_empty_board()
        fill_board(board)
        solution = deep_copy(board)
        if remove_cells(board, clues):
            return deep_copy(board), solution

    raise ValueError(
        f"Could not generate a unique puzzle with {clues} clues"
    )



