const express = require('express')
const fs = require('fs-extra')
const path = require('path')
const cors = require('cors')
const bodyParser = require('body-parser')
const app = express()

app.use(
    cors({
        origin: '*',
        credentials: true,
    })
)

app.use(bodyParser.json())

app.get('/python-file', (req, res) => {
    const { name } = req.query
    const parentDirectory = path.join(__dirname, '..')
    const modelPath = path.join(parentDirectory, name)
    const filePath = path.join(modelPath, `modules/avan.py`)
    const fileContent = fs.readFileSync(filePath, 'utf8')
    res.set('Content-Type', 'text/plain')
    res.send(fileContent)
})

app.post('/python-file', (req, res) => {
    const { data, name } = req.body
    const parentDirectory = path.join(__dirname, '..')
    const modelPath = path.join(parentDirectory, name)
    const filePath = path.join(modelPath, `modules/avan.py`)
    fs.writeFileSync(filePath, data)
    res.status(200).end()
})

app.get('/model-file', (req, res) => {
    const { name } = req.query
    const parentDirectory = path.join(__dirname, '..')
    const modelPath = path.join(parentDirectory, name)
    const filePath = path.join(modelPath, `dialogs/${name}.json`)
    if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8')
        res.set('Content-Type', 'text/plain')
        res.send(fileContent)
    } else {
        res.status(400).send(`Файл ${name} не существует!`)
    }
})

app.post('/model-file', (req, res) => {
    const { data, name } = req.body
    const parentDirectory = path.join(__dirname, '..')
    const modelPath = path.join(parentDirectory, name)
    const filePath = path.join(modelPath, `dialogs/${name}.json`)
    fs.writeFileSync(filePath, JSON.stringify(data))
    res.status(200).end()
})

app.post('/model', async (req, res) => {
    const modelName = req.body.name
    const parentDirectory = path.join(__dirname, '..')
    const modelPath = path.join(parentDirectory, modelName)
    if (fs.existsSync(modelPath)) {
        res.status(400).send(`Папка с именем ${modelName} уже существует`)
    } else {
        fs.mkdir(modelPath, async () => {
            await fs.mkdir(path.join(modelPath, 'dialogs'))
            await fs.mkdir(path.join(modelPath, 'export'))
            await fs.mkdir(path.join(modelPath, 'logs'))
            await fs.mkdir(path.join(modelPath, 'plugins'))
            await fs.mkdir(path.join(modelPath, 'processors'))
            await fs.mkdir(path.join(modelPath, 'recordings'))
            await fs.mkdir(path.join(modelPath, 'storage'))
            await fs.copy(
                path.join(__dirname, 'config'),
                path.join(modelPath, 'config')
            )
            await fs.copy(
                path.join(__dirname, 'modules'),
                path.join(modelPath, 'modules')
            )
            const filePath = path.join(modelPath, `dialogs/${modelName}.json`)
            await fs.writeFile(filePath, '{"blocks": {}}')
            res.send(`Директория ${modelName} успешно создана`)
        })
    }
})

app.get('/model', (req, res) => {
    const parentDirectory = path.join(__dirname, '..')
    fs.readdir(parentDirectory, (err, files) => {
        if (err) {
            res.status(500).send('Ошибка при чтении директории')
        } else {
            const modelFolders = files.filter((file) => {
                const fullPath = path.join(parentDirectory, file)
                return (
                    fs.statSync(fullPath).isDirectory() &&
                    file !== 'server' &&
                    file !== 'client'
                )
            })

            res.status(200).json(modelFolders)
        }
    })
})

app.delete('/model', (req, res) => {
    const { name } = req.query
    const parentDirectory = path.join(__dirname, '..')
    const modelPath = path.join(parentDirectory, name)
    fs.remove(modelPath, (err) => {
        if (err) res.status(400).send(`Ошибка при удалении ${name}`)
        else res.status(200).send(`Директория ${name} успешно удалена`)
    })
})

app.listen(5000, () => {
    console.log('Сервер запущен на порту 5000.')
})
