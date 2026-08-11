# Hướng dẫn build ra file APK

Project này là app Android native (Kotlin + Jetpack Compose), đã có sẵn icon app (lấy từ icon.png bạn cung cấp).

## Cách 1: Dùng Android Studio (khuyên dùng, dễ nhất)
1. Cài Android Studio (nếu chưa có): https://developer.android.com/studio
2. Mở Android Studio → Open → chọn thư mục `android` (thư mục này)
3. Đợi Gradle sync xong (lần đầu sẽ tải Gradle + thư viện, cần internet)
4. Vào menu Build → Build Bundle(s) / APK(s) → Build APK(s)
5. File APK sẽ nằm ở: `app/build/outputs/apk/debug/app-debug.apk`
6. Copy file .apk vào điện thoại và cài đặt (cần bật "Cho phép cài từ nguồn không xác định")

## Cách 2: Dùng dòng lệnh (nếu đã cài Android SDK + JDK 17)
```bash
cd android
./gradlew assembleDebug
```
File APK debug sẽ ở: `app/build/outputs/apk/debug/app-debug.apk`

Để build bản release (ký số để phát hành lên Google Play):
```bash
./gradlew assembleRelease
```
(cần cấu hình signing key trước, xem thêm tại: https://developer.android.com/studio/publish/app-signing)

## Lưu ý quan trọng
- App này kết nối tới server backend qua WebSocket (địa chỉ cấu hình sẵn trong 
  `app/build.gradle.kts` ở mục `SERVER_URL`). Nếu server đó không còn hoạt động, 
  bạn cần tự deploy lại server (file `server.ts` ở thư mục gốc dự án, dùng để 
  chuyển tiếp tới Gemini Live API) và cập nhật lại địa chỉ trong build.gradle.kts.
- App cần quyền Microphone để chat giọng nói — đã khai báo sẵn trong AndroidManifest.xml.
- Icon app đã được nhúng sẵn tại `app/src/main/res/mipmap-*` (icon vuông + tròn + adaptive icon).

## Vì sao mình không build sẵn APK cho bạn?
Môi trường của mình bị giới hạn mạng (chỉ được truy cập một số domain như GitHub, npm...), 
không truy cập được máy chủ của Google (dl.google.com) và Gradle (services.gradle.org) 
để tải Android SDK / thư viện cần thiết, nên không thể compile ra file APK tại đây.
Bạn build theo hướng dẫn trên chỉ mất khoảng 5-10 phút.
