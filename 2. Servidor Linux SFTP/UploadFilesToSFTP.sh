#!/bin/bash

# Variables Iniciales
# Script: UploadFilesToSFTP
# Description: It runs every 1 minute, and transfers files to SFTP server.
# Args:
# $1: Number Of Queue  

# Initial Variables
numberOfAudios=100
directory="/home/usuarioftp"
logFile="/tmp/LogUploadFilesToSFTP.log"
LogEnabled=1
echo $logFile
PATHFILES="/home/usuarioftp/FTPSpeech$1/speechanalytics"
inFile=""
outFile=""
remotedirPath="/speechanalytics"
remotedir=""
BUCKET_NAME="sftp-test-speech"
parallelJobs=2

# Logging functions
logInfo() {
    if [ "$LogEnabled" -eq 1 ]; then
        echo "$(date +%r-%N) INFO: $1" >> $logFile
    fi
}

logError() {
    echo "$(date +%r-%N) ERROR: $1" >> $logFile
}

upload_file() {
    local file=$1
    logInfo "Processing file $file"
    uploaded=0
    inFile=$file
    callIdentification=$(basename "$inFile" .wav)
    
    if [[ -f $inFile ]]; then
        #logInfo "$inFile exists. Uploading file to SFTP Server"
        
        # Determine remote directory
        relative_path=$(dirname "${inFile#$PATHFILES/}")
        remotedir="$remotedirPath/$relative_path"
        
        # Upload to S3 (you mentioned SFTP but are using aws s3api, confirming S3 upload here)
        aws s3api put-object \
            --bucket "$BUCKET_NAME" \
            --key "$remotedir/$(basename "$inFile")" \
            --body "$inFile" \
            --output text
        
        uploaded=$?
        if [ "$uploaded" -eq 0 ]; then
            logInfo "File uploaded successfully to SFTP server for id: $callIdentification"
            rm -f "$inFile"
        else
            logError "Error transferring file for $callIdentification to SFTP server"
            logInfo "Failed $callIdentification. Processing next file."
        fi
    fi
}

export -f logInfo logError upload_file
export PATHFILES remotedirPath BUCKET_NAME logFile LogEnabled

main() {
    logInfo "Starting script with argument: $1"

    # Check if argument is provided
    if [ -z "$1" ]; then
        logError "Argument missing: Number Of Queue is required"
        exit 1
    fi

    # Check if another instance of the script is running
    inProcess=$(pgrep -f "/usr/sbin/UploadFilesToSFTP.sh $1" | wc -l)
    echo "inProcess = $inProcess"
    if [ "$inProcess" -ge 3 ]; then
        logInfo "Another instance of the script is already running"
        exit 1
    fi 

    # Remove empty subdirectories
    logInfo "Removing empty subdirectories in $PATHFILES"
    find "$PATHFILES" -mindepth 1 -type d -empty -delete

    # Process files
    #logInfo "Processing files"
    logInfo "Processing a maximum of $numberOfAudios files"

    find "$PATHFILES" -maxdepth 5 -type f -print | head -n "$numberOfAudios" | parallel -j "$parallelJobs" upload_file
}

main "$1"
