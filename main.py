from telethon import TelegramClient

# Isi dengan detail akun Telegram
api_id = 'API_ID'
api_hash = 'API_HASH'
phone_number = 'YOUR_PHONE'

client = TelegramClient('session_name', api_id, api_hash)

async def main():
    await client.start(phone_number)
    await client.send_message('wheelofwhalesbot', '/start')
    # Masukkan logika tap dan spin otomatis

with client:
    client.loop.run_until_complete(main())
