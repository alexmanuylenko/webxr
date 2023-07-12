# webxr

WebXR AR Demo with SLAM and Image Tracking

Демо дополненной реальности на технологии WebXR с использованием технологий SLAM и трекингом изображений (маркеров).

Summary:

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
- GitExtensions (опционально, в VS Code есть контроль версий)
- Консоль: Windows PowerShell или другая (тоже опционально, можно пользоваться консолью VS Code)

Забрать исходный код проекта можно:

- Вытянув репозиторий по ссылке https://github.com/alexmanuylenko/webxr.git соответственно командой: 

``` bash
git clone https://github.com/alexmanuylenko/webxr.git
```

- Нажав на зеленую кнопку "Code" -> "Download ZIP"

- Форкнув (Fork) этот репозиторий на GitHub. Тогда развертывание должно автоматически настроиться на ваши GitHub Pages (не проверял)

Далее можно запустить VS Code и открыть папку (Open folder) с проектом и начать вводить команды в терминал (Terminal) VS Code-а.

1) При первом запуске проекта надо подтянуть зависимости командой: 

``` bash
npm install
```

Предполагается, что Node.js установлен.

2) Отладочный сервер запускается командой: 

``` bash
npm run dev
```

При запуске он покажет в консоли терминала по каким локальным адресам доступно приложение (сайт).

3) Команда 

``` bash
npm run build 
```

собирает production bundle в подкаталог ```./app``` (используется Webpack).

4) Команда 

``` bash
npm run deploy 
```

собирает production bundle и публикует его в ветке ```gh-pages``` репозитория. На эту ветку должны быть настроены ваши GitHub Pages для публикации приложения.

5) В файле ```package.json``` значение ```"repository": "#"``` можно, а возможно и нужно заменить на ссылку на ваш собственный репозиторий, возможно тоже репозиторий на GitHub,
ссылка должна иметь такой же вид как указанная выше ссылка для "вытягивания" (```git pull```) репозитория.

6) Из-за проблем с CORS-делами и соответственно проблемами с загрузкой, ресурсы приложения (assets), а именно модели и изображения маркеров хранятся в отдельном репозитории на отдельных GitHub Pages:

``` bash
https://github.com/alexmanuylenko/webxr-assets
```

``` bash
https://alexmanuylenko.github.io/webxr-assets/
```