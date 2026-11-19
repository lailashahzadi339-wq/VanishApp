# VANISH – Class Messaging App

## 1. Project Overview

VANISH is a class-based messaging application developed using React Native and Expo. It allows students to communicate with other members of the same class.

The main purpose of VANISH is to provide temporary messaging. Messages disappear approximately 30 seconds after successful delivery to the recipient.

## 2. Main Features

- **Join a Class:** Students can join a class using their name, relay server address, and class code.
- **Send Messages:** Students can send text messages to other members of their class.
- **Temporary Messages:** Messages disappear approximately 30 seconds after delivery.
- **Delivery-Based Expiry:** The countdown starts when the recipient receives the message, not when the sender sends it.
- **Offline Message Delivery:** Messages can be received when a student reconnects to the server.
- **Class Members:** Students can view the members of their class.
- **Duplicate Prevention:** The application prevents the same message from appearing multiple times.
- **Message Validation:** Empty messages and messages exceeding the character limit are rejected.
- **Modern Interface:** The application uses a dark-blue user interface.

## 3. Technologies Used

### Frontend
- React Native
- Expo
- TypeScript
- Expo Router
- AsyncStorage
- Expo Crypto

### Backend
- Python
- FastAPI
- SQLite
- Uvicorn

## 4. Project Structure

```text
VanishApp/
│
├── src/
│   └── app/
│       ├── index.tsx
│       └── chat.tsx
│
├── components/
│
├── backend/
│
├── package.json
└── README.md
```

## 5. How to Run the Application

### Step 1: Start the Backend

Open PowerShell and navigate to the backend server folder:

```powershell
cd "$HOME\Documents\Semester 5\Mobile Application Development\field-sync\field-sync\server"
```

Start the FastAPI server:

```powershell
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

The backend will run on port 8000.

Keep this terminal open while using the application.

### Step 2: Start the Frontend

Open another terminal in VS Code.

Navigate to the VANISH project:

```powershell
cd "$HOME\Desktop\VanishApp"
```

Install the project dependencies:

```powershell
npm install
```

Start Expo:

```powershell
npx.cmd expo start
```

Scan the QR code using Expo Go to open the application.

### Step 3: Connect the Phones

1. Connect both phones and the laptop to the same Wi-Fi network.
2. Enter the laptop's local IP address and backend port in the relay server field.
3. Enter the class code.
4. Enter a student name.
5. Join the class on both phones.

Example relay address:

```text
wss://vanish-backend-mcls.onrender.com
```

The IP address may be different on another network.

## 6. Message Expiry

VANISH uses delivery-based message expiry.

1. The sender sends a message.
2. The backend creates a delivery record for the recipient.
3. When the recipient receives and acknowledges the message, the backend records the delivery time.
4. The backend calculates the expiry time as 30 seconds after delivery.
5. The message disappears after its expiry time.

This approach keeps message expiry synchronized with actual delivery rather than the sender's sending time.

## 7. Testing

The following tests were performed during development:

- Both phones successfully joined the same class.
- Messages were sent and received between two phones.
- Messages disappeared after approximately 30 seconds from delivery.
- Offline messages were delivered after reconnecting.
- Countdown behavior was checked after backgrounding and reopening the app.
- Expired messages did not reappear after restarting the application.
- Duplicate messages were prevented.
- Message ordering was checked.
- Class member listing was tested.
- Unauthorized requests were rejected by the backend.
- Message length validation was tested.
- Duplicate message submissions were tested.
- TypeScript compilation completed without errors.

## 8. Security and Validation

VANISH includes backend validation and access checks.

- Class membership is checked before accessing class messages.
- Unauthorized requests are rejected.
- Empty messages are not accepted.
- Messages longer than 2000 characters are rejected.
- Duplicate message submissions are handled using unique client message IDs.
- Delivery acknowledgements are checked against the correct recipient.
- API requests are validated by the backend.

## 9. Project Purpose

VANISH was developed as a university Mobile Application Development project to demonstrate mobile application development, client-server communication, message synchronization, temporary messaging, validation, and basic application security.

## 10. Conclusion

VANISH demonstrates how a mobile messaging application can provide class-based communication with delivery-based message expiry. The project combines a React Native frontend with a Python FastAPI backend and was tested using two mobile devices.
