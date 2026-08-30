# backend/app/guardrail/kill_switch.py

class KillSwitchState:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(KillSwitchState, cls).__new__(cls)
            cls._instance.active = False
        return cls._instance

    def set_active(self, active: bool):
        self.active = active

    def is_active(self) -> bool:
        return self.active

kill_switch = KillSwitchState()
