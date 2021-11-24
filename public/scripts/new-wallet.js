new ClipboardJS('.copy-mnemonic');

const Mnemonic = window.bsvMnemonic;
const Mnemonic1 = Mnemonic.fromRandom();
$(".mnemonic").val(Mnemonic1);
