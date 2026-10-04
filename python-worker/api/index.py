import sys
import os

# Add parent directory to module search path so extractors package is found
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from App import app
