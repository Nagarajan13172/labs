"""Standard real-time progress message (mirrors the original `MqttMsg`)."""

from __future__ import annotations

from pydantic import BaseModel


class MqttMsg(BaseModel):
    message: str
    status: bool = True
    is_finished: bool = False
    is_error: bool = False

    def to_json(self) -> str:
        return self.model_dump_json()
