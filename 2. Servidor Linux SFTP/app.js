const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

// Configurar las credenciales de AWS
AWS.config.update({
    accessKeyId: config.accessKey,
    secretAccessKey: config.secretKey,
    region: config.region
});

const s3 = new AWS.S3();
const logFilePath = config.Log_Folder;

const logDebug = (message) => {
    const logMessage = `DEBUG: ${message}\n`;
    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) {
            //console.error(`Failed to write debug log: ${err.message}`);
        }
    });
};

const logError = (message) => {
    const logMessage = `ERROR: ${message}\n`;
    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) {
            //console.error(`Failed to write error log: ${err.message}`);
        }
    });
};

const procesarArchivosYFolders = async (instance, folders) => {
    const tempDirectory =  `${config.Temp_Directory}FTPSpeech${instance}`;
    const cantidadArchivos = parseInt(config.cantidad_archivos);
    const bucketName = config.bucketName;

    logDebug(`folders - ${folders}`);

    try {
        for (const folder of folders) {
            let deleteFolder = false;

            logDebug(`SubirArchivosDeFolderFTP - ${folder}, ${folder.replace(tempDirectory, "")}`);

            let archivos = fs.readdirSync(folder)
                .filter(file => !file.startsWith("PROCESS_"))  // Filtra archivos que no comienzan con "PROCESS_"
                .filter(file => {
                    const filePath = path.join(folder, file);
                    return fs.statSync(filePath).isFile();  // Verifica que sea un archivo y no un directorio
                })
                .slice(0, cantidadArchivos);

            let archivos_val = fs.readdirSync(folder)
                .filter(file => {
                    const filePath = path.join(folder, file);
                    return fs.statSync(filePath).isFile();  // Verifica que sea un archivo y no un directorio
                })
                .slice(0, cantidadArchivos);

            let subfolders = fs.readdirSync(folder, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => path.join(folder, dirent.name));

            logDebug(`Folder: ${folder}, Archivos: ${archivos.length}, Subfolders: ${subfolders.length}`);

            let sub_folders = folder.replace(tempDirectory, "").split('/');

            if (archivos_val.length === 0 && subfolders.length === 0) {

                deleteFolder = true;

                if (sub_folders.length === 5) {
                    let fechaCarpeta = new Date(parseInt(sub_folders[2]), parseInt(sub_folders[3]) - 1, parseInt(sub_folders[4]));
                    let fechaActual = new Date();
                    if (fechaCarpeta < fechaActual.setDate(fechaActual.getDate() - 1)) {
                        deleteFolder = true;
                    } else {
                        deleteFolder = false;
                    }
                }

                if (deleteFolder) {
                    logDebug(`DeleteLocalFolder - Folder: ${folder}`);
                    fs.rmdirSync(folder, { recursive: true });
                }
            }

            if (archivos.length > 0 && subfolders.length === 0) {

                let tasks = archivos.map(async (archivo) => {
                    let archivoPath = path.join(folder, archivo);
                    let archivoFinal = archivoPath.replace(tempDirectory, "");
                    let newFilePath = path.join(path.dirname(archivoPath), `PROCESS_${archivo}`);

                    let procesado = false;

                    try {
                        fs.renameSync(archivoPath, newFilePath);
                    } catch (err) {
                        logError(`Error al renombrar el archivo ${archivoPath}: ${err.message}`);
                    }

                    try {
                        let fileStream = fs.createReadStream(newFilePath);
                        let params = {
                            Bucket: bucketName,
                            Key: archivoFinal.slice(1),
                            Body: fileStream
                        };
                        await s3.putObject(params).promise();
                        procesado = true;
                        logDebug(`El archivo ${archivoPath} ha sido transferido a ${archivoFinal.slice(1).replace("\\", "/")}`);
                    } catch (err) {
                        logError(`Error al transferir el archivo ${archivoPath}: ${err.message}`);
                    }

                    if (procesado) {
                        try {
                            fs.unlinkSync(newFilePath);
                        } catch (err) {
                            logError(`Error al eliminar el archivo: ${newFilePath}, ${err.message}`);
                        }
                    }
                });

                await Promise.all(tasks);
            }
        }
    } catch (err) {
        logError(`Error en procesarArchivosYFolders: ${err.message}`);
    }
};

function getAllDirectories(dir) {
    let results = [];
    const list = fs.readdirSync(dir, { withFileTypes: true });

    list.forEach(dirent => {
        const fullPath = path.join(dir, dirent.name);
        if (dirent.isDirectory()) {
            results.push(fullPath);
            results = results.concat(getAllDirectories(fullPath));  // Llamada recursiva para subdirectorios
        }
    });

    return results;
}

const procesar = async (instance) => {
    try {

        let tempFolder = `${config.Temp_Directory}FTPSpeech${instance}/speechanalytics`;
        let folders = getAllDirectories(tempFolder);    
        await procesarArchivosYFolders(instance, folders);
    } catch (err) {
        logError(`Error al Procesar: ${err.message}`);
    }
};

// Get the instance from command line arguments
const instance = parseInt(process.argv[2]) || 1;

// Start processing with the given instance number
procesar(instance);
