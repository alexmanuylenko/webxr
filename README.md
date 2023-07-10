# webxr

WebXR AR Demo with SLAM and Image Tracking

Демо дополненной реальности на технологии WebXR с использованием технологий SLAM и трекингом изображений (маркеров).

``` bash
# Install dependencies (only the first time)
npm install

# Run the local server at localhost:8080
npm run dev

# Build production bundle, located in ./dist directory, that can be deployed to any server/hosting
npm run build

# Deploy app production bundle, currently to GitHub Pages, associated with repository
npm run deploy

```

Для работы с данным проектом вам понадобятся:
- Visual Studio Code
- Node.js
- Git
- GitExtentions (опционально, в VS Code есть контроль версий)
- Консоль: Windows PowerShell или другая (тоже опционально, можно пользоваться консолью VS Code)

Забрать исходный код проекта можно:

- Вытянув репозиторий по ссылке https://github.com/alexmanuylenko/webxr.git соответственно командой: 

``` bash
git clone https://github.com/alexmanuylenko/webxr.git
```

- Нажав на зеленую кнопку "Code" -> "Download ZIP"

- Форкнув (Fork) этот репозиторий на GitHub. Тогда развертывание должно автоматически настроиться на ваши GitHub Pages (не проверял)

Далее можно запустить VS Code и открыть папку (Open folder) с проектом и начать вводить команды в терминал (Terminal) VS Code-а.

При первом запуске проекта надо подтянуть зависимости командой npm install (предполагается, что Node.js установлен).

Отладочный сервер запускается командой npm run dev, при запуске он покажет в консоли терминала по каким локальным адресам доступно приложение (сайт).

Команда npm run build собирает production bundle в подкаталог ./dist (используется Webpack).

Команда npm run deploy собирает production bundle и публикует его в ветке gh-pages репозитория, на эту ветку должны быть настроены ваши GitHub Pages для публикации приложения.

В файле package.json значение "repository": "#" можно, а возможно и нужно заменить на ссылку на ваш собственный репозиторий, возможно тоже репозиторий на GitHub,
ссылка должна иметь такой же вид как указанная выше ссылка для "вытягивания" репозитория.

Из-за проблем с CORS-делами и соответственно проблемами с загрузкой ресурсы приложения (assets), а именно модели и изображения маркеров хранятся в отдельном репозитории на отдельных GitHub Pages:

https://github.com/alexmanuylenko/webxr-assets

https://alexmanuylenko.github.io/webxr-assets/
