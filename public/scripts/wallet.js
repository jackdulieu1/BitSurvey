$(".qr-code-button").on("click", function () {
    if ($("#qr-code").css('visibility') == 'hidden') {
        $("#qr-code").css('visibility', 'visible')
    } else {
        $("#qr-code").css('visibility', 'hidden');
    }
});

const words = $(".mnemonic").text();
const Mnemonic = window.bsvMnemonic;
const Mnemonic1 = Mnemonic.fromString(words);
const hdPrivateKey = bsv.HDPrivateKey.fromSeed(Mnemonic1.toSeed());
const hdPublicKey = bsv.HDPublicKey.fromHDPrivateKey(hdPrivateKey);
const privateKey = hdPrivateKey.deriveChild(`m/44'/0'/0'`).privateKey;
const publicKey = bsv.PublicKey.fromPrivateKey(privateKey);
const address = bsv.Address.fromPublicKey(publicKey);

const addressCode = 'bitcoinsv:' + address;
new QRCode(document.getElementById("qr-code"), addressCode);
$("img").addClass("display-inline");


const wocApiUrl = 'https://api.whatsonchain.com/v1/bsv/main/address/' + address + '/balance';
const utxoUrl = "https://api.bitindex.network/api/v3/main/addr/" + address + "/utxo";
const bsvUrl = "https://min-api.cryptocompare.com/data/price?fsym=BSV&tsyms=GBP";

const config1 = {
    method: "get",
    url: wocApiUrl,
};

const config2 = {
    method: "get",
    url: bsvUrl,
};

axios(config1).then((response) => {
    const data = response.data;
    const conf = Number(data.confirmed / 100000000);
    $('.confirmed-balance').text(conf.toFixed(6));
}).then(function () {
    axios(config2).then((response) => {
        bsvData = response.data;
        const num = Number(bsvData.GBP);
        const cBal = Number($(".confirmed-balance").text())
        $('.gbp-balance').text((cBal * num).toFixed(2));
    })
});