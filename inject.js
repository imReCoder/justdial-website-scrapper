const { TesseractWorker } = Tesseract;
const worker = new TesseractWorker();

const screenshot = (el) => {
    // console.log("screenshot of el ", el)
    return new Promise((resolve, reject) => {

        html2canvas(el).then(async (canvas) => {
            // console.log("got canvas ", canvas);
            const data = await decodeOcr(canvas);
            resolve(data);
        }).catch(e => {
            resolve('')
            console.log("error ", e)
        })
    })
}


const decodeOcr = async (canvas) => {
    return new Promise((resolve, reject) => {
        try {

            let ctx = canvas.getContext('2d')
            let src = canvas.toDataURL('image/png')
            worker.recognize(src)
                .progress(function (packet) {
                    console.log("progress ", packet)
                })
                .then(function (data) {
                    console.log(data)
                    console.log("done ");
                    resolve(data?.text || '')
                }).catch(e => {
                    console.log("error ", e);
                    resolve('')

                })
        } catch (e) {
            console.log(e);
            resolve('')

        }
    })
}