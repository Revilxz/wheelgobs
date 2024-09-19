from telethon import TelegramClient, events
import asyncio

# Ganti dengan API ID dan API Hash yang kamu dapat dari Telegram
api_id = 'YOUR_API_ID'
api_hash = 'YOUR_API_HASH'
phone_number = 'YOUR_PHONE_NUMBER'

# Inisiasi klien Telegram
client = TelegramClient('session_name', api_id, api_hash)

# Fungsi untuk melakukan login dan tap energi
async def daily_tap():
    async with client:
        # Mengirim perintah /start ke bot
        await client.send_message('wheelofwhalesbot', '/start')
        await asyncio.sleep(5)  # Tunggu 5 detik
        
        # Simulasi tap energi
        for _ in range(1000):  # Loop untuk melakukan 1000 tap
            await client.send_message('wheelofwhalesbot', 'tap')
            await asyncio.sleep(1)  # Tunggu 1 detik antara tiap tap
        
        # Mendapatkan spin setelah tap selesai
        await client.send_message('wheelofwhalesbot', 'spin')
        print("Spin selesai!")

# Menjalankan fungsi setiap hari
async def main():
    while True:
        await daily_tap()
        await asyncio.sleep(86400)  # Menunggu 24 jam untuk menjalankan lagi (86400 detik)

# Jalankan bot
with client:
    client.loop.run_until_complete(main())
