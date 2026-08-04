#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import base64
import json
import os
import sys
import traceback
import tkinter as tk
from datetime import datetime, timedelta, timezone
from pathlib import Path
from tkinter import messagebox, ttk

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

PRIVATE_KEY_B64 = "N12FcZistSUqyZ9uUZunWbxeXv7oeGKQVlm9i6cPI/8="
PREFIX = "NKH1"
PRODUCT_ID = "nukhba-paints-decor-owner"
TRIAL_DAYS = 3
APP_VERSION = "2.2.0"


def app_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def write_error_log(exc: BaseException) -> Path:
    path = app_dir() / "Nukhba_License_Generator_Error.log"
    text = (
        f"Time: {datetime.now().isoformat()}\n"
        f"Error: {exc!r}\n\n"
        f"{traceback.format_exc()}"
    )
    try:
        path.write_text(text, encoding="utf-8")
    except Exception:
        pass
    return path


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def normalize_device(value: str) -> str:
    return "".join(value.strip().upper().split())


def validate_device_code(device_code: str) -> str:
    code = normalize_device(device_code)
    parts = code.split("-")
    if (
        len(parts) != 7
        or parts[0] != "NKH"
        or parts[1] != "PD"
        or any(len(part) != 4 for part in parts[2:])
        or any(ch not in "0123456789ABCDEF" for part in parts[2:] for ch in part)
    ):
        raise ValueError(
            "كود الجهاز غير صحيح.\n\n"
            "الصيغة المطلوبة:\n"
            "NKH-PD-1234-5678-9ABC-DEF0-1234"
        )
    return code


def build_license(device_code: str, customer: str) -> tuple[str, dict]:
    device_code = validate_device_code(device_code)
    now = datetime.now(timezone.utc).replace(microsecond=0)
    expires = now + timedelta(days=TRIAL_DAYS)
    payload = {
        "device_code": device_code,
        "product_id": PRODUCT_ID,
        "license_type": "temporary",
        "issued_at": now.isoformat().replace("+00:00", "Z"),
        "expires_at": expires.isoformat().replace("+00:00", "Z"),
        "customer": customer.strip() or None,
    }
    payload_bytes = json.dumps(
        payload, ensure_ascii=False, separators=(",", ":"), sort_keys=True
    ).encode("utf-8")
    private_key = Ed25519PrivateKey.from_private_bytes(
        base64.b64decode(PRIVATE_KEY_B64)
    )
    signature = private_key.sign(payload_bytes)
    return f"{PREFIX}.{b64url(payload_bytes)}.{b64url(signature)}", payload


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("النخبة — مولّد تفعيل الصبغ والديكور")
        self.geometry("820x690")
        self.minsize(760, 620)
        self.configure(bg="#090f1c")
        self.option_add("*Font", ("Segoe UI", 11))
        self.protocol("WM_DELETE_WINDOW", self.destroy)
        self._build()
        self.after(120, lambda: self.device.focus_set())

    def _build(self):
        style = ttk.Style(self)
        style.theme_use("clam")
        style.configure("Card.TFrame", background="#111c2e")
        style.configure("TLabel", background="#111c2e", foreground="#f7f9fc")
        style.configure(
            "Title.TLabel",
            background="#111c2e",
            font=("Segoe UI", 21, "bold"),
            foreground="#2dd2be",
        )
        style.configure(
            "Info.TLabel",
            background="#111c2e",
            font=("Segoe UI", 11, "bold"),
            foreground="#f0bd5b",
        )
        style.configure("TButton", padding=10)
        style.configure("TEntry", padding=8)

        card = ttk.Frame(self, style="Card.TFrame", padding=26)
        card.pack(fill="both", expand=True, padx=24, pady=24)

        ttk.Label(card, text="مولّد تفعيل تجربة 3 أيام", style="Title.TLabel").pack(anchor="e")
        ttk.Label(card, text="تطبيق إدارة الصبغ والديكور — خاص بالمالك فقط").pack(anchor="e", pady=(4, 5))
        ttk.Label(card, text=f"متوافق مع Android v{APP_VERSION}", style="Info.TLabel").pack(anchor="e", pady=(0, 18))

        self.device = self._field(card, "كود الجهاز")
        self.customer = self._field(card, "اسم الزبون / المحل (اختياري)")

        info = ttk.Frame(card, style="Card.TFrame")
        info.pack(fill="x", pady=10)
        ttk.Label(info, text="نوع الترخيص:").pack(side="right")
        ttk.Label(info, text="تجريبي فقط", foreground="#2dd2be").pack(side="right", padx=(8, 24))
        ttk.Label(info, text="المدة:").pack(side="right")
        ttk.Label(info, text="3 أيام / 72 ساعة", foreground="#2dd2be").pack(side="right", padx=8)

        buttons = ttk.Frame(card, style="Card.TFrame")
        buttons.pack(fill="x", pady=(16, 10))
        ttk.Button(buttons, text="توليد كود 3 أيام", command=self.generate).pack(side="right")
        ttk.Button(buttons, text="نسخ كود التفعيل", command=self.copy_token).pack(side="right", padx=8)
        ttk.Button(buttons, text="لصق كود الجهاز", command=self.paste_device).pack(side="right")
        ttk.Button(buttons, text="مسح", command=self.clear).pack(side="right", padx=8)

        ttk.Label(card, text="معلومات الكود:").pack(anchor="e", pady=(10, 4))
        self.details = ttk.Label(card, text="لم يتم توليد كود بعد.", justify="right")
        self.details.pack(anchor="e", pady=(0, 8))

        ttk.Label(card, text="كود التفعيل:").pack(anchor="e", pady=(4, 5))
        self.output = tk.Text(
            card,
            height=10,
            wrap="word",
            bg="#07111f",
            fg="#ffffff",
            insertbackground="#ffffff",
            relief="flat",
            padx=12,
            pady=12,
        )
        self.output.pack(fill="both", expand=True)

        ttk.Label(
            card,
            text="تنبيه: هذا المولد يبقى عند المالك فقط ولا يُرسل للزبون.",
            style="Info.TLabel",
        ).pack(anchor="e", pady=(10, 0))

    def _field(self, parent, label):
        row = ttk.Frame(parent, style="Card.TFrame")
        row.pack(fill="x", pady=7)
        ttk.Label(row, text=label + ":").pack(side="right")
        entry = ttk.Entry(row, justify="right")
        entry.pack(side="right", fill="x", expand=True, padx=(0, 12))
        return entry

    def generate(self):
        try:
            token, payload = build_license(self.device.get(), self.customer.get())
            issued = payload["issued_at"].replace("T", " ").replace("Z", " UTC")
            expires = payload["expires_at"].replace("T", " ").replace("Z", " UTC")
            self.output.delete("1.0", "end")
            self.output.insert("1.0", token)
            self.details.configure(
                text=(
                    f"الجهاز: {payload['device_code']}\n"
                    f"الإصدار: v{APP_VERSION}\n"
                    f"بداية الترخيص: {issued}\n"
                    f"نهاية الترخيص: {expires}"
                )
            )
        except Exception as exc:
            messagebox.showerror("خطأ", str(exc), parent=self)

    def copy_token(self):
        token = self.output.get("1.0", "end").strip()
        if not token:
            messagebox.showwarning("تنبيه", "ولّد كود التفعيل أولًا.", parent=self)
            return
        self.clipboard_clear()
        self.clipboard_append(token)
        self.update()
        messagebox.showinfo("تم", "تم نسخ كود تفعيل الثلاثة أيام.", parent=self)

    def paste_device(self):
        try:
            value = self.clipboard_get()
        except tk.TclError:
            messagebox.showwarning("تنبيه", "لا يوجد نص في الحافظة.", parent=self)
            return
        self.device.delete(0, "end")
        self.device.insert(0, normalize_device(value))

    def clear(self):
        self.device.delete(0, "end")
        self.customer.delete(0, "end")
        self.output.delete("1.0", "end")
        self.details.configure(text="لم يتم توليد كود بعد.")


def main():
    app = App()
    app.mainloop()


if __name__ == "__main__":
    try:
        main()
    except BaseException as exc:
        log_path = write_error_log(exc)
        try:
            root = tk.Tk()
            root.withdraw()
            messagebox.showerror(
                "تعذر تشغيل مولّد الأكواد",
                "حدث خطأ أثناء التشغيل.\n\n"
                f"تم حفظ تفاصيل الخطأ في:\n{log_path}",
                parent=root,
            )
            root.destroy()
        except Exception:
            pass
        raise
