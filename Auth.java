package com.trade.fisco;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.fisco.bcos.sdk.v3.client.Client;
import org.fisco.bcos.sdk.v3.codec.datatypes.Address;
import org.fisco.bcos.sdk.v3.codec.datatypes.Bool;
import org.fisco.bcos.sdk.v3.codec.datatypes.Event;
import org.fisco.bcos.sdk.v3.codec.datatypes.Function;
import org.fisco.bcos.sdk.v3.codec.datatypes.Type;
import org.fisco.bcos.sdk.v3.codec.datatypes.TypeReference;
import org.fisco.bcos.sdk.v3.codec.datatypes.Utf8String;
import org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256;
import org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint8;
import org.fisco.bcos.sdk.v3.codec.datatypes.generated.tuples.generated.Tuple1;
import org.fisco.bcos.sdk.v3.codec.datatypes.generated.tuples.generated.Tuple2;
import org.fisco.bcos.sdk.v3.codec.datatypes.generated.tuples.generated.Tuple7;
import org.fisco.bcos.sdk.v3.contract.Contract;
import org.fisco.bcos.sdk.v3.crypto.CryptoSuite;
import org.fisco.bcos.sdk.v3.crypto.keypair.CryptoKeyPair;
import org.fisco.bcos.sdk.v3.model.CryptoType;
import org.fisco.bcos.sdk.v3.model.TransactionReceipt;
import org.fisco.bcos.sdk.v3.model.callback.CallCallback;
import org.fisco.bcos.sdk.v3.model.callback.TransactionCallback;
import org.fisco.bcos.sdk.v3.transaction.model.exception.ContractException;

@SuppressWarnings("unchecked")
public class Auth extends Contract {
    public static final String[] BINARY_ARRAY = {"60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506040518060e00160405280600115158152602001600115158152602001600015158152602001600015158152602001600015158152602001606481526020016040518060400160405280600a81526020017f537570657241646d696e00000000000000000000000000000000000000000000815250815250600160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008201518160000160006101000a81548160ff02191690831515021790555060208201518160000160016101000a81548160ff02191690831515021790555060408201518160000160026101000a81548160ff02191690831515021790555060608201518160000160036101000a81548160ff02191690831515021790555060808201518160000160046101000a81548160ff02191690831515021790555060a0820151816001015560c0820151816002019080519060200190620001d1929190620001db565b50905050620002f0565b828054620001e990620002ba565b90600052602060002090601f0160209004810192826200020d576000855562000259565b82601f106200022857805160ff191683800117855562000259565b8280016001018555821562000259579182015b82811115620002585782518255916020019190600101906200023b565b5b5090506200026891906200026c565b5090565b5b80821115620002875760008160009055506001016200026d565b5090565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b60006002820490506001821680620002d357607f821691505b60208210811415620002ea57620002e96200028b565b5b50919050565b6112b680620003006000396000f3fe608060405234801561001057600080fd5b50600436106100935760003560e01c806375829def1161006657806375829def146101305780638305866f1461014c578063a87430ba1461017c578063bca4bd50146101b2578063f851a440146101e257610093565b806324d7806c1461009857806332434a2e146100c85780634039ad0d146100e4578063571c3e6014610114575b600080fd5b6100b260048036038101906100ad9190610cfa565b610200565b6040516100bf9190610d42565b60405180910390f35b6100e260048036038101906100dd9190610ea3565b610259565b005b6100fe60048036038101906100f99190610cfa565b610515565b60405161010b9190610d42565b60405180910390f35b61012e60048036038101906101299190610f38565b61056e565b005b61014a60048036038101906101459190610cfa565b6107ce565b005b61016660048036038101906101619190610cfa565b610a04565b6040516101739190610d42565b60405180910390f35b61019660048036038101906101919190610cfa565b610a5d565b6040516101a99796959493929190611019565b60405180910390f35b6101cc60048036038101906101c79190610cfa565b610b68565b6040516101d99190610d42565b60405180910390f35b6101ea610bc1565b6040516101f7919061109e565b60405180910390f35b6000600160008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060000160019054906101000a900460ff169050919050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146102e7576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016102de90611105565b60405180910390fd5b600160008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060000160009054906101000a900460ff1615610377576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161036e90611171565b60405180910390fd5b6040518060e001604052806001151581526020016000151581526020016000151581526020016000151581526020016000151581526020016064815260200182815250600160008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008201518160000160006101000a81548160ff02191690831515021790555060208201518160000160016101000a81548160ff02191690831515021790555060408201518160000160026101000a81548160ff02191690831515021790555060608201518160000160036101000a81548160ff02191690831515021790555060808201518160000160046101000a81548160ff02191690831515021790555060a0820151816001015560c08201518160020190805190602001906104bf929190610be5565b509050508173ffffffffffffffffffffffffffffffffffffffff167f48cac28ad4dc618e15f4c2dd5e97751182f166de97b25618318b2112aa951a2f826040516105099190611191565b60405180910390a25050565b6000600160008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060000160029054906101000a900460ff169050919050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146105fc576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016105f390611105565b60405180910390fd5b600160008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060000160009054906101000a900460ff1661068b576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610682906111ff565b60405180910390fd5b60018160ff1614156106f65760018060008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060000160026101000a81548160ff0219169083151502179055506107ca565b60028160ff1614156107615760018060008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060000160036101000a81548160ff0219169083151502179055506107c9565b60038160ff1614156107c85760018060008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060000160046101000a81548160ff0219169083151502179055505b5b5b5050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461085c576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161085390611105565b60405180910390fd5b600160008273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060000160009054906101000a900460ff166108eb576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016108e2906111ff565b60405180910390fd5b60018060008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060000160016101000a81548160ff0219169083151502179055506000600160008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060000160016101000a81548160ff021916908315150217905550806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555050565b6000600160008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060000160049054906101000a900460ff169050919050565b60016020528060005260406000206000915090508060000160009054906101000a900460ff16908060000160019054906101000a900460ff16908060000160029054906101000a900460ff16908060000160039054906101000a900460ff16908060000160049054906101000a900460ff1690806001015490806002018054610ae59061124e565b80601f0160208091040260200160405190810160405280929190818152602001828054610b119061124e565b8015610b5e5780601f10610b3357610100808354040283529160200191610b5e565b820191906000526020600020905b815481529060010190602001808311610b4157829003601f168201915b5050505050905087565b6000600160008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060000160039054906101000a900460ff169050919050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b828054610bf19061124e565b90600052602060002090601f016020900481019282610c135760008555610c5a565b82601f10610c2c57805160ff1916838001178555610c5a565b82800160010185558215610c5a579182015b82811115610c59578251825591602001919060010190610c3e565b5b509050610c679190610c6b565b5090565b5b80821115610c84576000816000905550600101610c6c565b5090565b6000604051905090565b600080fd5b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000610cc782610c9c565b9050919050565b610cd781610cbc565b8114610ce257600080fd5b50565b600081359050610cf481610cce565b92915050565b6000602082","84031215610d1057610d0f610c92565b5b6000610d1e84828501610ce5565b91505092915050565b60008115159050919050565b610d3c81610d27565b82525050565b6000602082019050610d576000830184610d33565b92915050565b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b610db082610d67565b810181811067ffffffffffffffff82111715610dcf57610dce610d78565b5b80604052505050565b6000610de2610c88565b9050610dee8282610da7565b919050565b600067ffffffffffffffff821115610e0e57610e0d610d78565b5b610e1782610d67565b9050602081019050919050565b82818337600083830152505050565b6000610e46610e4184610df3565b610dd8565b905082815260208101848484011115610e6257610e61610d62565b5b610e6d848285610e24565b509392505050565b600082601f830112610e8a57610e89610d5d565b5b8135610e9a848260208601610e33565b91505092915050565b60008060408385031215610eba57610eb9610c92565b5b6000610ec885828601610ce5565b925050602083013567ffffffffffffffff811115610ee957610ee8610c97565b5b610ef585828601610e75565b9150509250929050565b600060ff82169050919050565b610f1581610eff565b8114610f2057600080fd5b50565b600081359050610f3281610f0c565b92915050565b60008060408385031215610f4f57610f4e610c92565b5b6000610f5d85828601610ce5565b9250506020610f6e85828601610f23565b9150509250929050565b6000819050919050565b610f8b81610f78565b82525050565b600081519050919050565b600082825260208201905092915050565b60005b83811015610fcb578082015181840152602081019050610fb0565b83811115610fda576000848401525b50505050565b6000610feb82610f91565b610ff58185610f9c565b9350611005818560208601610fad565b61100e81610d67565b840191505092915050565b600060e08201905061102e600083018a610d33565b61103b6020830189610d33565b6110486040830188610d33565b6110556060830187610d33565b6110626080830186610d33565b61106f60a0830185610f82565b81810360c08301526110818184610fe0565b905098975050505050505050565b61109881610cbc565b82525050565b60006020820190506110b3600083018461108f565b92915050565b7f4f6e6c792041646d696e00000000000000000000000000000000000000000000600082015250565b60006110ef600a83610f9c565b91506110fa826110b9565b602082019050919050565b6000602082019050818103600083015261111e816110e2565b9050919050565b7f416c726561647920726567697374657265640000000000000000000000000000600082015250565b600061115b601283610f9c565b915061116682611125565b602082019050919050565b6000602082019050818103600083015261118a8161114e565b9050919050565b600060208201905081810360008301526111ab8184610fe0565b905092915050565b7f4e6f742072656769737465726564000000000000000000000000000000000000600082015250565b60006111e9600e83610f9c565b91506111f4826111b3565b602082019050919050565b60006020820190508181036000830152611218816111dc565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000600282049050600182168061126657607f821691505b6020821081141561127a5761127961121f565b5b5091905056fea2646970667358221220a95ed4d8a6eb7ad83a6e0fd6348d9266331c6ea1f96f2594c5b0fb5cec62e2b764736f6c634300080b0033"};

    public static final String BINARY = org.fisco.bcos.sdk.v3.utils.StringUtils.joinAll("", BINARY_ARRAY);

    public static final String[] SM_BINARY_ARRAY = {};

    public static final String SM_BINARY = org.fisco.bcos.sdk.v3.utils.StringUtils.joinAll("", SM_BINARY_ARRAY);

    public static final String[] ABI_ARRAY = {"[{\"inputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"constructor\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"u\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"}],\"name\":\"UserRegistered\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"admin\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_a\",\"type\":\"address\"}],\"name\":\"isAdmin\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_a\",\"type\":\"address\"}],\"name\":\"isLogistics\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_a\",\"type\":\"address\"}],\"name\":\"isTrader\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_a\",\"type\":\"address\"}],\"name\":\"isWarehouse\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_u\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"_name\",\"type\":\"string\"}],\"name\":\"register\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_u\",\"type\":\"address\"},{\"internalType\":\"uint8\",\"name\":\"_role\",\"type\":\"uint8\"}],\"name\":\"setRole\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_newAdmin\",\"type\":\"address\"}],\"name\":\"transferAdmin\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"name\":\"users\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"registered\",\"type\":\"bool\"},{\"internalType\":\"bool\",\"name\":\"admin_\",\"type\":\"bool\"},{\"internalType\":\"bool\",\"name\":\"trader\",\"type\":\"bool\"},{\"internalType\":\"bool\",\"name\":\"warehouse\",\"type\":\"bool\"},{\"internalType\":\"bool\",\"name\":\"logistics\",\"type\":\"bool\"},{\"internalType\":\"uint256\",\"name\":\"credit\",\"type\":\"uint256\"},{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"}],\"stateMutability\":\"view\",\"type\":\"function\"}]"};

    public static final String ABI = org.fisco.bcos.sdk.v3.utils.StringUtils.joinAll("", ABI_ARRAY);

    public static final String FUNC_ADMIN = "admin";

    public static final String FUNC_ISADMIN = "isAdmin";

    public static final String FUNC_ISLOGISTICS = "isLogistics";

    public static final String FUNC_ISTRADER = "isTrader";

    public static final String FUNC_ISWAREHOUSE = "isWarehouse";

    public static final String FUNC_REGISTER = "register";

    public static final String FUNC_SETROLE = "setRole";

    public static final String FUNC_TRANSFERADMIN = "transferAdmin";

    public static final String FUNC_USERS = "users";

    public static final Event USERREGISTERED_EVENT = new Event("UserRegistered", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Address>(true) {}, new TypeReference<Utf8String>() {}));
    ;

    protected Auth(String contractAddress, Client client, CryptoKeyPair credential) {
        super(getBinary(client.getCryptoSuite()), contractAddress, client, credential);
    }

    public static String getBinary(CryptoSuite cryptoSuite) {
        return (cryptoSuite.getCryptoTypeConfig() == CryptoType.ECDSA_TYPE ? BINARY : SM_BINARY);
    }

    public static String getABI() {
        return ABI;
    }

    public List<UserRegisteredEventResponse> getUserRegisteredEvents(
            TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = extractEventParametersWithLog(USERREGISTERED_EVENT, transactionReceipt);
        ArrayList<UserRegisteredEventResponse> responses = new ArrayList<UserRegisteredEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            UserRegisteredEventResponse typedResponse = new UserRegisteredEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.u = (String) eventValues.getIndexedValues().get(0).getValue();
            typedResponse.name = (String) eventValues.getNonIndexedValues().get(0).getValue();
            responses.add(typedResponse);
        }
        return responses;
    }

    public String admin() throws ContractException {
        final Function function = new Function(FUNC_ADMIN, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Address>() {}));
        return executeCallWithSingleValueReturn(function, String.class);
    }

    public void admin(CallCallback callback) throws ContractException {
        final Function function = new Function(FUNC_ADMIN, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Address>() {}));
        asyncExecuteCall(function, callback);
    }

    public Boolean isAdmin(String _a) throws ContractException {
        final Function function = new Function(FUNC_ISADMIN, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_a)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Bool>() {}));
        return executeCallWithSingleValueReturn(function, Boolean.class);
    }

    public void isAdmin(String _a, CallCallback callback) throws ContractException {
        final Function function = new Function(FUNC_ISADMIN, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_a)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Bool>() {}));
        asyncExecuteCall(function, callback);
    }

    public Boolean isLogistics(String _a) throws ContractException {
        final Function function = new Function(FUNC_ISLOGISTICS, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_a)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Bool>() {}));
        return executeCallWithSingleValueReturn(function, Boolean.class);
    }

    public void isLogistics(String _a, CallCallback callback) throws ContractException {
        final Function function = new Function(FUNC_ISLOGISTICS, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_a)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Bool>() {}));
        asyncExecuteCall(function, callback);
    }

    public Boolean isTrader(String _a) throws ContractException {
        final Function function = new Function(FUNC_ISTRADER, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_a)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Bool>() {}));
        return executeCallWithSingleValueReturn(function, Boolean.class);
    }

    public void isTrader(String _a, CallCallback callback) throws ContractException {
        final Function function = new Function(FUNC_ISTRADER, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_a)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Bool>() {}));
        asyncExecuteCall(function, callback);
    }

    public Boolean isWarehouse(String _a) throws ContractException {
        final Function function = new Function(FUNC_ISWAREHOUSE, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_a)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Bool>() {}));
        return executeCallWithSingleValueReturn(function, Boolean.class);
    }

    public void isWarehouse(String _a, CallCallback callback) throws ContractException {
        final Function function = new Function(FUNC_ISWAREHOUSE, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_a)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Bool>() {}));
        asyncExecuteCall(function, callback);
    }

    public TransactionReceipt register(String _u, String _name) {
        final Function function = new Function(
                FUNC_REGISTER, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_u), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Utf8String(_name)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return executeTransaction(function);
    }

    public String getSignedTransactionForRegister(String _u, String _name) {
        final Function function = new Function(
                FUNC_REGISTER, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_u), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Utf8String(_name)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return createSignedTransaction(function);
    }

    public String register(String _u, String _name, TransactionCallback callback) {
        final Function function = new Function(
                FUNC_REGISTER, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_u), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Utf8String(_name)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return asyncExecuteTransaction(function, callback);
    }

    public Tuple2<String, String> getRegisterInput(TransactionReceipt transactionReceipt) {
        String data = transactionReceipt.getInput().substring(10);
        final Function function = new Function(FUNC_REGISTER, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Address>() {}, new TypeReference<Utf8String>() {}));
        List<Type> results = this.functionReturnDecoder.decode(data, function.getOutputParameters());
        return new Tuple2<String, String>(

                (String) results.get(0).getValue(), 
                (String) results.get(1).getValue()
                );
    }

    public TransactionReceipt setRole(String _u, BigInteger _role) {
        final Function function = new Function(
                FUNC_SETROLE, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_u), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint8(_role)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return executeTransaction(function);
    }

    public String getSignedTransactionForSetRole(String _u, BigInteger _role) {
        final Function function = new Function(
                FUNC_SETROLE, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_u), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint8(_role)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return createSignedTransaction(function);
    }

    public String setRole(String _u, BigInteger _role, TransactionCallback callback) {
        final Function function = new Function(
                FUNC_SETROLE, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_u), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint8(_role)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return asyncExecuteTransaction(function, callback);
    }

    public Tuple2<String, BigInteger> getSetRoleInput(TransactionReceipt transactionReceipt) {
        String data = transactionReceipt.getInput().substring(10);
        final Function function = new Function(FUNC_SETROLE, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Address>() {}, new TypeReference<Uint8>() {}));
        List<Type> results = this.functionReturnDecoder.decode(data, function.getOutputParameters());
        return new Tuple2<String, BigInteger>(

                (String) results.get(0).getValue(), 
                (BigInteger) results.get(1).getValue()
                );
    }

    public TransactionReceipt transferAdmin(String _newAdmin) {
        final Function function = new Function(
                FUNC_TRANSFERADMIN, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_newAdmin)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return executeTransaction(function);
    }

    public String getSignedTransactionForTransferAdmin(String _newAdmin) {
        final Function function = new Function(
                FUNC_TRANSFERADMIN, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_newAdmin)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return createSignedTransaction(function);
    }

    public String transferAdmin(String _newAdmin, TransactionCallback callback) {
        final Function function = new Function(
                FUNC_TRANSFERADMIN, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_newAdmin)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return asyncExecuteTransaction(function, callback);
    }

    public Tuple1<String> getTransferAdminInput(TransactionReceipt transactionReceipt) {
        String data = transactionReceipt.getInput().substring(10);
        final Function function = new Function(FUNC_TRANSFERADMIN, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Address>() {}));
        List<Type> results = this.functionReturnDecoder.decode(data, function.getOutputParameters());
        return new Tuple1<String>(

                (String) results.get(0).getValue()
                );
    }

    public Tuple7<Boolean, Boolean, Boolean, Boolean, Boolean, BigInteger, String> users(
            String param0) throws ContractException {
        final Function function = new Function(FUNC_USERS, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(param0)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Bool>() {}, new TypeReference<Bool>() {}, new TypeReference<Bool>() {}, new TypeReference<Bool>() {}, new TypeReference<Bool>() {}, new TypeReference<Uint256>() {}, new TypeReference<Utf8String>() {}));
        List<Type> results = executeCallWithMultipleValueReturn(function);
        return new Tuple7<Boolean, Boolean, Boolean, Boolean, Boolean, BigInteger, String>(
                (Boolean) results.get(0).getValue(), 
                (Boolean) results.get(1).getValue(), 
                (Boolean) results.get(2).getValue(), 
                (Boolean) results.get(3).getValue(), 
                (Boolean) results.get(4).getValue(), 
                (BigInteger) results.get(5).getValue(), 
                (String) results.get(6).getValue());
    }

    public void users(String param0, CallCallback callback) throws ContractException {
        final Function function = new Function(FUNC_USERS, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(param0)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Bool>() {}, new TypeReference<Bool>() {}, new TypeReference<Bool>() {}, new TypeReference<Bool>() {}, new TypeReference<Bool>() {}, new TypeReference<Uint256>() {}, new TypeReference<Utf8String>() {}));
        asyncExecuteCall(function, callback);
    }

    public static Auth load(String contractAddress, Client client, CryptoKeyPair credential) {
        return new Auth(contractAddress, client, credential);
    }

    public static Auth deploy(Client client, CryptoKeyPair credential) throws ContractException {
        return deploy(Auth.class, client, credential, getBinary(client.getCryptoSuite()), getABI(), null, null);
    }

    public static class UserRegisteredEventResponse {
        public TransactionReceipt.Logs log;

        public String u;

        public String name;
    }
}
