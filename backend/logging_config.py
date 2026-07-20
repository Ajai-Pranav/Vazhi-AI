import json
import logging
import os
import sys

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%SZ"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_record)

def setup_logging():
    json_logging = os.environ.get("JSON_LOGGING", "false").lower() == "true"
    
    root_logger = logging.getLogger()
    
    # Clear existing handlers
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)
        
    handler = logging.StreamHandler(sys.stdout)
    if json_logging:
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(logging.Formatter(
            fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S"
        ))
        
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)
    
    # Configure logs for external libraries to prevent log spam
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy").setLevel(logging.WARNING)
