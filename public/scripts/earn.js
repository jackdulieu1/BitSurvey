$("#a1").on("click", function () {
    $("#a1r").prop("checked", true);
});
$("#a2").on("click", function () {
    $("#a2r").prop("checked", true);
});
$("#a3").on("click", function () {
    $("#a3r").prop("checked", true);
});
$("#a4").on("click", function () {
    $("#a4r").prop("checked", true);
});

// set timout here? 
$(document).ready(function () {
    $('#submit-button').click(function () {
        if (!$("input[name='answer']:checked").val()) {
            alert('None Selected!');
            return false
        } else {
            // DO THE PAYMENT HERE
        }
    });
});

// const privateKey = bsv.PrivateKey.fromString("");
// const publicKey = bsv.PublicKey.fromPrivateKey(privateKey);
// const address = bsv.Address.fromPublicKey(publicKey);

const words = "target abuse can parade staff moral tired buzz grow vibrant magic strong"

const Mnemonic = window.bsvMnemonic;

const Mnemonic1 = Mnemonic.fromString(words);
const hdPrivateKey = bsv.HDPrivateKey.fromSeed(Mnemonic1.toSeed());
const privateKey = hdPrivateKey.deriveChild(`m/44'/0'/0'`).privateKey;
const publicKey = bsv.PublicKey.fromPrivateKey(privateKey);
const address = bsv.Address.fromPublicKey(publicKey);

const utxoUrl = "https://api.bitindex.network/api/v3/main/addr/" + address + "/utxo"


// STEP 1
var utxoCombinedAmount = 0;
var utxoArrayInput = [];
var amount = Number($("#rewardAmount").text());
var utxoArray = [];
var breakException = {};


async function utxoData() {
    utxoArray = [];
    const config = {
        method: "get",
        url: `https://api.mattercloud.net/api/v3/main/address/${address}/utxo`,
    };
    axios(config).then((response) => {
        utxoArray = response.data;
        utxoArray.sort((a, b) => (a.value > b.value) ? 1 : ((b.value > a.value) ? -1 : 0));
        console.log(utxoArray);
        return utxoArray
    });
};

// STEP 2, check to see if enough satoshis in wallet.

async function checkSatoshis() {
    utxoCombinedAmount = 0;
    utxoArrayInput = [];
    utxoArray.forEach(function (i) {
        if (utxoCombinedAmount < amount) {
            utxoArrayInput.push({
                txid: i.txid,
                amount: i.value,
                script: i.scriptPubKey,
                vout: i.vout,
            });
            utxoCombinedAmount += i.value;
        } else {
            console.log("done");
        }
    });
    console.log(utxoCombinedAmount);
};

utxoData();
setTimeout(checkSatoshis, 1000);