# -----------------------------------------------------------------------------
# models/__init__.py — Model Registry
# -----------------------------------------------------------------------------
# This file imports ALL database models in one place.
#
# WHY THIS MATTERS:
# Alembic (our migration tool) needs to "see" every model before it can
# generate migration scripts. If a model isn't imported here, Alembic won't
# notice when you add new columns or tables, and your migration will be empty.
#
# Rule: every time you create a new model file, add its import here.
# -----------------------------------------------------------------------------

from models.organisation import Organisation
from models.user import User
from models.ticket import Ticket
from models.message import Message
from models.kb_document import KbDocument
from models.notification import Notification

__all__ = ["Organisation", "User", "Ticket", "Message", "KbDocument", "Notification"]
