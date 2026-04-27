import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.text_validation import clean_text, require_text


class TextValidationTests(unittest.TestCase):
    def test_clean_text_collapses_whitespace(self):
        self.assertEqual(clean_text("  Alpha\n\n Beta\tGamma  "), "Alpha Beta Gamma")

    def test_require_text_rejects_short_input(self):
        with self.assertRaises(ValueError) as error:
            require_text("Too short", min_chars=30, label="Document")

        self.assertIn("Document must contain at least 30 characters", str(error.exception))

    def test_require_text_returns_cleaned_text(self):
        self.assertEqual(
            require_text("  Payment is due within thirty days.  ", min_chars=20),
            "Payment is due within thirty days.",
        )


if __name__ == "__main__":
    unittest.main()
