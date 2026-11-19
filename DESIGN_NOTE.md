# VANISH – Design Note

## 1. Introduction

VANISH is a class-based messaging application developed using React Native and Expo. Its main purpose is to allow students to communicate with classmates through temporary text messages.

The main design idea is that messages automatically disappear approximately 30 seconds after successful delivery.

## 2. Application Design

VANISH uses a client-server architecture.

- **Frontend:** React Native and Expo provide the mobile application interface.
- **Backend:** FastAPI handles requests, message delivery, class membership, and message expiry.
- **Database:** SQLite stores class members, messages, and delivery information.

## 3. Main Screens

### Home / Join Class Screen

The Home screen allows students to enter:
- Student name
- Relay server address
- Class code

After validation, the application sends a request to the backend to join the class.

### Chat Screen

The Chat screen allows students to:
- View messages.
- Send messages to classmates.
- See the class members list.
- View message expiry countdowns.
- Receive messages from other class members.

## 4. Message Expiry Design

The most important feature of VANISH is delivery-based message expiry.

The expiry countdown does not start when the sender sends a message.

Instead:
1. The sender sends a message to the backend.
2. The backend creates delivery records for recipients.
3. The recipient receives the message and acknowledges delivery.
4. The backend records the delivery time.
5. The backend sets the expiry time to 30 seconds after delivery.
6. The application removes the message when it expires.

This design helps keep expiry consistent between devices.

## 5. Offline Message Handling

If a recipient is offline, the backend keeps the pending delivery information.

When the recipient reconnects:
- The application requests pending messages.
- The backend returns eligible messages.
- The recipient acknowledges delivery.
- The 30-second expiry period begins.

## 6. User Interface Design

The application uses a modern dark-blue theme.

The main design choices include:
- Dark navy background.
- Blue accent colors.
- Clear text and buttons.
- Dark cards and input fields.
- Simple navigation and readable layouts.

The design aims to make the application easy to understand and use.

## 7. Security and Validation

VANISH includes basic security measures:
- Backend class membership verification.
- Validation of incoming requests.
- Rejection of empty messages.
- Maximum message length of 2000 characters.
- Duplicate message submission prevention.
- Delivery acknowledgement ownership checks.
- Rejection of unauthorized requests.

## 8. Conclusion

VANISH combines temporary messaging, class-based communication, offline delivery, and backend validation. Its design focuses on simplicity, reliable message delivery, and automatic message expiry.
