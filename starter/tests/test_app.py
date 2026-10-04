import unittest
from unittest.mock import patch

import app
import sudoku_logic


SOLUTION = [
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
    [4, 5, 6, 7, 8, 9, 1, 2, 3],
    [7, 8, 9, 1, 2, 3, 4, 5, 6],
    [2, 3, 4, 5, 6, 7, 8, 9, 1],
    [5, 6, 7, 8, 9, 1, 2, 3, 4],
    [8, 9, 1, 2, 3, 4, 5, 6, 7],
    [3, 4, 5, 6, 7, 8, 9, 1, 2],
    [6, 7, 8, 9, 1, 2, 3, 4, 5],
    [9, 1, 2, 3, 4, 5, 6, 7, 8],
]


def has_valid_units(board: list[list[int]]) -> bool:
    """Return whether every row, column, and 3x3 box contains 1 through 9."""
    expected = set(range(1, sudoku_logic.SIZE + 1))
    rows_valid = all(set(row) == expected for row in board)
    columns_valid = all(
        {board[row][column] for row in range(sudoku_logic.SIZE)} == expected
        for column in range(sudoku_logic.SIZE)
    )
    boxes_valid = all(
        {
            board[row][column]
            for row in range(box_row, box_row + 3)
            for column in range(box_column, box_column + 3)
        }
        == expected
        for box_row in range(0, sudoku_logic.SIZE, 3)
        for box_column in range(0, sudoku_logic.SIZE, 3)
    )
    return rows_valid and columns_valid and boxes_valid


class PuzzleGenerationTests(unittest.TestCase):
    def test_count_solutions_stops_at_limit_and_preserves_board(self) -> None:
        board = sudoku_logic.create_empty_board()
        original = [row.copy() for row in board]

        self.assertEqual(sudoku_logic.count_solutions(board, limit=2), 2)
        self.assertEqual(board, original)

    def test_generated_difficulties_have_configured_clues_and_unique_solutions(self) -> None:
        for difficulty, clues in sudoku_logic.DIFFICULTIES.items():
            with self.subTest(difficulty=difficulty):
                puzzle, _ = sudoku_logic.generate_puzzle(clues)

                self.assertEqual(
                    sum(value != 0 for row in puzzle for value in row), clues
                )
                self.assertEqual(sudoku_logic.count_solutions(puzzle), 1)

    def test_generate_puzzle_preserves_valid_solution_and_requested_clues(self) -> None:
        clues = 35

        puzzle, solution = sudoku_logic.generate_puzzle(clues)

        self.assertTrue(has_valid_units(solution))
        self.assertEqual(sum(value != 0 for row in puzzle for value in row), clues)
        self.assertEqual(sudoku_logic.count_solutions(puzzle), 1)
        for row in range(sudoku_logic.SIZE):
            for column in range(sudoku_logic.SIZE):
                if puzzle[row][column] != sudoku_logic.EMPTY:
                    self.assertEqual(puzzle[row][column], solution[row][column])


class AppRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        app.app.config.update(TESTING=True)
        self.client = app.app.test_client()
        app.CURRENT.update(puzzle=None, solution=None)

    def test_index_renders_game_page(self) -> None:
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Sudoku", response.data)

    def test_new_game_difficulties_return_the_right_clue_count(self) -> None:
        for difficulty, clues in sudoku_logic.DIFFICULTIES.items():
            puzzle = [row.copy() for row in SOLUTION]
            for index in range(clues, sudoku_logic.SIZE * sudoku_logic.SIZE):
                puzzle[index // sudoku_logic.SIZE][index % sudoku_logic.SIZE] = (
                    sudoku_logic.EMPTY
                )

            with self.subTest(difficulty=difficulty):
                with patch.object(
                    app.sudoku_logic,
                    "generate_puzzle",
                    return_value=(puzzle, SOLUTION),
                ) as generate_puzzle:
                    if difficulty == "easy":
                        response = self.client.get(f"/new?difficulty={difficulty}")
                    else:
                        response = self.client.post(
                            "/new", json={"difficulty": difficulty}
                        )

                self.assertEqual(response.status_code, 200)
                returned_puzzle = response.get_json()["puzzle"]
                self.assertEqual(
                    sum(value != 0 for row in returned_puzzle for value in row),
                    clues,
                )
                self.assertEqual(app.CURRENT["solution"], SOLUTION)
                generate_puzzle.assert_called_once_with(clues)

    def test_new_game_rejects_invalid_difficulty(self) -> None:
        with patch.object(app.sudoku_logic, "generate_puzzle") as generate_puzzle:
            response = self.client.get("/new?difficulty=expert")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json(), {"error": "Invalid difficulty"})
        generate_puzzle.assert_not_called()

    def test_new_game_defaults_to_medium(self) -> None:
        with patch.object(
            app.sudoku_logic, "generate_puzzle", return_value=(SOLUTION, SOLUTION)
        ) as generate_puzzle:
            response = self.client.get("/new")

        self.assertEqual(response.status_code, 200)
        generate_puzzle.assert_called_once_with(sudoku_logic.DIFFICULTIES["medium"])

    def test_check_without_game_returns_bad_request(self) -> None:
        response = self.client.post("/check", json={"board": SOLUTION})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json(), {"error": "No game in progress"})

    def test_check_rejects_malformed_board(self) -> None:
        self.start_game()

        response = self.client.post("/check", json={"board": [[1, 2, 3]]})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json(), {"error": "Invalid board"})

    def test_check_reports_no_incorrect_cells_for_solution(self) -> None:
        self.start_game()

        response = self.client.post("/check", json={"board": SOLUTION})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"incorrect": []})

    def test_check_reports_coordinates_of_incorrect_cells(self) -> None:
        self.start_game()
        submitted_board = [row.copy() for row in SOLUTION]
        submitted_board[0][0] = 9

        response = self.client.post("/check", json={"board": submitted_board})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"incorrect": [[0, 0]]})

    def test_hint_returns_only_the_correct_value_for_an_empty_cell(self) -> None:
        self.start_game()
        board = [row.copy() for row in SOLUTION]
        board[0][0] = sudoku_logic.EMPTY

        response = self.client.post("/hint", json={"board": board})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"row": 0, "column": 0, "value": 1})

    def test_hint_returns_the_correct_value_for_an_incorrect_cell(self) -> None:
        self.start_game()
        board = [row.copy() for row in SOLUTION]
        board[0][0] = 9

        response = self.client.post("/hint", json={"board": board})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"row": 0, "column": 0, "value": 1})

    def start_game(self) -> None:
        puzzle = [row.copy() for row in SOLUTION]
        puzzle[0][0] = sudoku_logic.EMPTY
        with patch.object(
            app.sudoku_logic, "generate_puzzle", return_value=(puzzle, SOLUTION)
        ):
            self.client.get("/new")


if __name__ == "__main__":
    unittest.main()