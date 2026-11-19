# VANISH – Testing Log

## 1. Testing Overview

The VANISH application was tested using two Android phones connected to the same Wi-Fi network and the same backend server.

The purpose of testing was to verify messaging, delivery-based expiry, offline handling, and backend security.

## 2. Functional Testing

| Test | Expected Result | Actual Result |
|---|---|---|
| Join class on Phone 1 | Student joins successfully | Passed |
| Join class on Phone 2 | Student joins successfully | Passed |
| Send message | Message reaches recipient | Passed |
| Receive message | Recipient displays message | Passed |
| Message expiry | Message disappears approximately 30 seconds after delivery | Passed |
| Offline delivery | Pending message arrives after reconnecting | Passed |
| Class members | Members list displays class members | Passed |
| Duplicate prevention | Duplicate messages are not displayed | Passed |
| Message ordering | Messages appear in correct order | Passed |
| App background | Countdown continues correctly | Passed |
| App restart | Expired messages do not reappear | Passed |
| Backend restart | Messaging works after server restarts | Passed |

## 3. Security Testing

| Test | Expected Result | Actual Result |
|---|---|---|
| Unauthorized member access | Request rejected | Passed |
| Unauthorized message access | Request rejected | Passed |
| Unauthorized message sending | Request rejected | Passed |
| Unauthorized acknowledgement | Request rejected | Passed |
| Duplicate message submission | Existing message is not duplicated | Passed |
| Message longer than 2000 characters | Request rejected | Passed |
| Sender acknowledges own delivery | Request rejected | Passed |

## 4. Development Testing

- TypeScript compilation was checked using `npx.cmd tsc --noEmit`.
- No TypeScript errors were reported.
- Backend endpoints were tested.
- Both Android phones were used for integration testing.

## 5. Conclusion

The main functional and security tests were completed successfully. The application demonstrated class joining, message sending and receiving, delivery-based expiry, offline message handling, and backend access validation.
