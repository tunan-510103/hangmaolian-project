package com.trade.fisco;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.fisco.bcos.sdk.v3.client.Client;
import org.fisco.bcos.sdk.v3.codec.abi.FunctionEncoder;
import org.fisco.bcos.sdk.v3.codec.datatypes.Address;
import org.fisco.bcos.sdk.v3.codec.datatypes.Event;
import org.fisco.bcos.sdk.v3.codec.datatypes.Function;
import org.fisco.bcos.sdk.v3.codec.datatypes.Type;
import org.fisco.bcos.sdk.v3.codec.datatypes.TypeReference;
import org.fisco.bcos.sdk.v3.codec.datatypes.Utf8String;
import org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256;
import org.fisco.bcos.sdk.v3.codec.datatypes.generated.tuples.generated.Tuple1;
import org.fisco.bcos.sdk.v3.codec.datatypes.generated.tuples.generated.Tuple2;
import org.fisco.bcos.sdk.v3.codec.datatypes.generated.tuples.generated.Tuple3;
import org.fisco.bcos.sdk.v3.codec.datatypes.generated.tuples.generated.Tuple5;
import org.fisco.bcos.sdk.v3.contract.Contract;
import org.fisco.bcos.sdk.v3.crypto.CryptoSuite;
import org.fisco.bcos.sdk.v3.crypto.keypair.CryptoKeyPair;
import org.fisco.bcos.sdk.v3.model.CryptoType;
import org.fisco.bcos.sdk.v3.model.TransactionReceipt;
import org.fisco.bcos.sdk.v3.model.callback.CallCallback;
import org.fisco.bcos.sdk.v3.model.callback.TransactionCallback;
import org.fisco.bcos.sdk.v3.transaction.model.exception.ContractException;

@SuppressWarnings("unchecked")
public class OrderLogistics extends Contract {
    public static final String[] BINARY_ARRAY = {"60806040523480156200001157600080fd5b5060405162001ab138038062001ab183398181016040528101906200003791906200012a565b816000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555080600160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550505062000171565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000620000f282620000c5565b9050919050565b6200010481620000e5565b81146200011057600080fd5b50565b6000815190506200012481620000f9565b92915050565b60008060408385031215620001445762000143620000c0565b5b6000620001548582860162000113565b9250506020620001678582860162000113565b9150509250929050565b61193080620001816000396000f3fe608060405234801561001057600080fd5b50600436106100625760003560e01c80633bd5d173146100675780635cb24008146100835780639d12d01c146100a1578063af22a05f146100d5578063bd08617d146100f1578063de9375f21461010d575b600080fd5b610081600480360381019061007c919061103a565b61012b565b005b61008b6104c3565b60405161009891906110e6565b60405180910390f35b6100bb60048036038101906100b6919061103a565b6104e9565b6040516100cc9594939291906111ca565b60405180910390f35b6100ef60048036038101906100ea919061138c565b61064f565b005b61010b600480360381019061010691906113fb565b610c65565b005b610115610f29565b6040516101229190611478565b60405180910390f35b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16638305866f336040518263ffffffff1660e01b81526004016101849190611493565b602060405180830381865afa1580156101a1573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906101c591906114e6565b610204576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016101fb9061155f565b60405180910390fd5b3373ffffffffffffffffffffffffffffffffffffffff166002600083815260200190815260200160002060000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16146102a8576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161029f906115cb565b60405180910390fd5b60018060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166345fa8aae836040518263ffffffff1660e01b815260040161030491906115eb565b602060405180830381865afa158015610321573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610345919061163f565b60ff1614610388576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161037f906116b8565b60405180910390fd5b4260026000838152602001908152602001600020600401819055506040518060400160405280600981526020017f44656c6976657265640000000000000000000000000000000000000000000000815250600260008381526020019081526020016000206002019080519060200190610402929190610f4d565b50600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663d896dd648260026040518363ffffffff1660e01b8152600401610461929190611713565b600060405180830381600087803b15801561047b57600080fd5b505af115801561048f573d6000803e3d6000fd5b50505050807ffcc296b8bdd64e3f1d1faadef50cb2d6550f645316330fe57cb1dd7e0612ead060405160405180910390a250565b600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60026020528060005260406000206000915090508060000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff16908060010180546105329061176b565b80601f016020809104026020016040519081016040528092919081815260200182805461055e9061176b565b80156105ab5780601f10610580576101008083540402835291602001916105ab565b820191906000526020600020905b81548152906001019060200180831161058e57829003601f168201915b5050505050908060020180546105c09061176b565b80601f01602080910402602001604051908101604052809291908181526020018280546105ec9061176b565b80156106395780601f1061060e57610100808354040283529160200191610639565b820191906000526020600020905b81548152906001019060200180831161061c57829003601f168201915b5050505050908060030154908060040154905085565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663bca4bd50336040518263ffffffff1660e01b81526004016106a89190611493565b602060405180830381865afa1580156106c5573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906106e991906114e6565b610728576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161071f906117e9565b60405180910390fd5b3373ffffffffffffffffffffffffffffffffffffffff16600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16631a4cfc33856040518263ffffffff1660e01b815260040161079a91906115eb565b602060405180830381865afa1580156107b7573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906107db919061181e565b73ffffffffffffffffffffffffffffffffffffffff1614610831576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610828906115cb565b60405180910390fd5b6003600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166345fa8aae856040518263ffffffff1660e01b815260040161088e91906115eb565b602060405180830381865afa1580156108ab573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906108cf919061163f565b60ff1614610912576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610909906116b8565b60405180910390fd5b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16638305866f826040518263ffffffff1660e01b815260040161096b9190611493565b602060405180830381865afa158015610988573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906109ac91906114e6565b6109eb576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016109e29061155f565b60405180910390fd5b6040518060a001604052808273ffffffffffffffffffffffffffffffffffffffff1681526020018381526020016040518060400160405280600a81526020017f496e205472616e73697400000000000000000000000000000000000000000000815250815260200142815260200160008152506002600085815260200190815260200160002060008201518160000160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506020820151816001019080519060200190610ad4929190610f4d565b506040820151816002019080519060200190610af1929190610f4d565b506060820151816003015560808201518160040155905050600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663fa14a8ec84836040518363ffffffff1660e01b8152600401610b6692919061184b565b600060405180830381600087803b158015610b8057600080fd5b505af1158015610b94573d6000803e3d6000fd5b50505050600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663d896dd648460016040518363ffffffff1660e01b8152600401610bf69291906118af565b600060405180830381600087803b158015610c1057600080fd5b505af1158015610c24573d6000803e3d6000fd5b50505050827ffef313c40a15096b5e2ec6bd9c8a036673f4309e4f891a9c252b7e369674477982604051610c589190611493565b60405180910390a2505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16638305866f336040518263ffffffff1660e01b8152600401610cbe9190611493565b602060405180830381865afa158015610cdb573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610cff91906114e6565b610d3e576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610d359061155f565b60405180910390fd5b3373ffffffffffffffffffffffffffffffffffffffff166002600084815260200190815260200160002060000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1614610de2576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610dd9906115cb565b60405180910390fd5b60018060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166345fa8aae846040518263ffffffff1660e01b8152600401610e3e91906115eb565b602060405180830381865afa158015610e5b573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610e7f919061163f56","5b60ff1614610ec2576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610eb9906116b8565b60405180910390fd5b80600260008481526020019081526020016000206002019080519060200190610eec929190610f4d565b50817f65edc79681b60dda53ce45315418e2d9637c424299784fc6aaf815fa304dda2b82604051610f1d91906118d8565b60405180910390a25050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b828054610f599061176b565b90600052602060002090601f016020900481019282610f7b5760008555610fc2565b82601f10610f9457805160ff1916838001178555610fc2565b82800160010185558215610fc2579182015b82811115610fc1578251825591602001919060010190610fa6565b5b509050610fcf9190610fd3565b5090565b5b80821115610fec576000816000905550600101610fd4565b5090565b6000604051905090565b600080fd5b600080fd5b6000819050919050565b61101781611004565b811461102257600080fd5b50565b6000813590506110348161100e565b92915050565b6000602082840312156110505761104f610ffa565b5b600061105e84828501611025565b91505092915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000819050919050565b60006110ac6110a76110a284611067565b611087565b611067565b9050919050565b60006110be82611091565b9050919050565b60006110d0826110b3565b9050919050565b6110e0816110c5565b82525050565b60006020820190506110fb60008301846110d7565b92915050565b600061110c82611067565b9050919050565b61111c81611101565b82525050565b600081519050919050565b600082825260208201905092915050565b60005b8381101561115c578082015181840152602081019050611141565b8381111561116b576000848401525b50505050565b6000601f19601f8301169050919050565b600061118d82611122565b611197818561112d565b93506111a781856020860161113e565b6111b081611171565b840191505092915050565b6111c481611004565b82525050565b600060a0820190506111df6000830188611113565b81810360208301526111f18187611182565b905081810360408301526112058186611182565b905061121460608301856111bb565b61122160808301846111bb565b9695505050505050565b600080fd5b600080fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b61126d82611171565b810181811067ffffffffffffffff8211171561128c5761128b611235565b5b80604052505050565b600061129f610ff0565b90506112ab8282611264565b919050565b600067ffffffffffffffff8211156112cb576112ca611235565b5b6112d482611171565b9050602081019050919050565b82818337600083830152505050565b60006113036112fe846112b0565b611295565b90508281526020810184848401111561131f5761131e611230565b5b61132a8482856112e1565b509392505050565b600082601f8301126113475761134661122b565b5b81356113578482602086016112f0565b91505092915050565b61136981611101565b811461137457600080fd5b50565b60008135905061138681611360565b92915050565b6000806000606084860312156113a5576113a4610ffa565b5b60006113b386828701611025565b935050602084013567ffffffffffffffff8111156113d4576113d3610fff565b5b6113e086828701611332565b92505060406113f186828701611377565b9150509250925092565b6000806040838503121561141257611411610ffa565b5b600061142085828601611025565b925050602083013567ffffffffffffffff81111561144157611440610fff565b5b61144d85828601611332565b9150509250929050565b6000611462826110b3565b9050919050565b61147281611457565b82525050565b600060208201905061148d6000830184611469565b92915050565b60006020820190506114a86000830184611113565b92915050565b60008115159050919050565b6114c3816114ae565b81146114ce57600080fd5b50565b6000815190506114e0816114ba565b92915050565b6000602082840312156114fc576114fb610ffa565b5b600061150a848285016114d1565b91505092915050565b7f4e6f74204c6f6769737469637300000000000000000000000000000000000000600082015250565b6000611549600d8361112d565b915061155482611513565b602082019050919050565b600060208201905081810360008301526115788161153c565b9050919050565b7f4e6f7420796f7572730000000000000000000000000000000000000000000000600082015250565b60006115b560098361112d565b91506115c08261157f565b602082019050919050565b600060208201905081810360008301526115e4816115a8565b9050919050565b600060208201905061160060008301846111bb565b92915050565b600060ff82169050919050565b61161c81611606565b811461162757600080fd5b50565b60008151905061163981611613565b92915050565b60006020828403121561165557611654610ffa565b5b60006116638482850161162a565b91505092915050565b7f57726f6e67207374617475730000000000000000000000000000000000000000600082015250565b60006116a2600c8361112d565b91506116ad8261166c565b602082019050919050565b600060208201905081810360008301526116d181611695565b9050919050565b6000819050919050565b60006116fd6116f86116f3846116d8565b611087565b611606565b9050919050565b61170d816116e2565b82525050565b600060408201905061172860008301856111bb565b6117356020830184611704565b9392505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000600282049050600182168061178357607f821691505b602082108114156117975761179661173c565b5b50919050565b7f4e6f742057617265686f75736500000000000000000000000000000000000000600082015250565b60006117d3600d8361112d565b91506117de8261179d565b602082019050919050565b60006020820190508181036000830152611802816117c6565b9050919050565b60008151905061181881611360565b92915050565b60006020828403121561183457611833610ffa565b5b600061184284828501611809565b91505092915050565b600060408201905061186060008301856111bb565b61186d6020830184611113565b9392505050565b6000819050919050565b600061189961189461188f84611874565b611087565b611606565b9050919050565b6118a98161187e565b82525050565b60006040820190506118c460008301856111bb565b6118d160208301846118a0565b9392505050565b600060208201905081810360008301526118f28184611182565b90509291505056fea2646970667358221220019c6ae32e92282fc2afd4721433d5503a7ed54dcf3328254c09b8615cbac37164736f6c634300080b0033"};

    public static final String BINARY = org.fisco.bcos.sdk.v3.utils.StringUtils.joinAll("", BINARY_ARRAY);

    public static final String[] SM_BINARY_ARRAY = {};

    public static final String SM_BINARY = org.fisco.bcos.sdk.v3.utils.StringUtils.joinAll("", SM_BINARY_ARRAY);

    public static final String[] ABI_ARRAY = {"[{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_auth\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"_orderCore\",\"type\":\"address\"}],\"stateMutability\":\"nonpayable\",\"type\":\"constructor\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"}],\"name\":\"Delivered\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"indexed\":false,\"internalType\":\"string\",\"name\":\"loc\",\"type\":\"string\"}],\"name\":\"LocationUpdated\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"logistics\",\"type\":\"address\"}],\"name\":\"Shipped\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"auth\",\"outputs\":[{\"internalType\":\"contract IAuth\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"_id\",\"type\":\"uint256\"}],\"name\":\"deliver\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"name\":\"logistics\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"logistics\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"company\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"location\",\"type\":\"string\"},{\"internalType\":\"uint256\",\"name\":\"shipTime\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"deliveryTime\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"orderCore\",\"outputs\":[{\"internalType\":\"contract IOrderCore\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"_id\",\"type\":\"uint256\"},{\"internalType\":\"string\",\"name\":\"_co\",\"type\":\"string\"},{\"internalType\":\"address\",\"name\":\"_lg\",\"type\":\"address\"}],\"name\":\"ship\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"_id\",\"type\":\"uint256\"},{\"internalType\":\"string\",\"name\":\"_loc\",\"type\":\"string\"}],\"name\":\"updateLoc\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]"};

    public static final String ABI = org.fisco.bcos.sdk.v3.utils.StringUtils.joinAll("", ABI_ARRAY);

    public static final String FUNC_AUTH = "auth";

    public static final String FUNC_DELIVER = "deliver";

    public static final String FUNC_LOGISTICS = "logistics";

    public static final String FUNC_ORDERCORE = "orderCore";

    public static final String FUNC_SHIP = "ship";

    public static final String FUNC_UPDATELOC = "updateLoc";

    public static final Event DELIVERED_EVENT = new Event("Delivered", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>(true) {}));
    ;

    public static final Event LOCATIONUPDATED_EVENT = new Event("LocationUpdated", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>(true) {}, new TypeReference<Utf8String>() {}));
    ;

    public static final Event SHIPPED_EVENT = new Event("Shipped", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>(true) {}, new TypeReference<Address>() {}));
    ;

    protected OrderLogistics(String contractAddress, Client client, CryptoKeyPair credential) {
        super(getBinary(client.getCryptoSuite()), contractAddress, client, credential);
    }

    public static String getBinary(CryptoSuite cryptoSuite) {
        return (cryptoSuite.getCryptoTypeConfig() == CryptoType.ECDSA_TYPE ? BINARY : SM_BINARY);
    }

    public static String getABI() {
        return ABI;
    }

    public List<DeliveredEventResponse> getDeliveredEvents(TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = extractEventParametersWithLog(DELIVERED_EVENT, transactionReceipt);
        ArrayList<DeliveredEventResponse> responses = new ArrayList<DeliveredEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            DeliveredEventResponse typedResponse = new DeliveredEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.id = (BigInteger) eventValues.getIndexedValues().get(0).getValue();
            responses.add(typedResponse);
        }
        return responses;
    }

    public List<LocationUpdatedEventResponse> getLocationUpdatedEvents(
            TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = extractEventParametersWithLog(LOCATIONUPDATED_EVENT, transactionReceipt);
        ArrayList<LocationUpdatedEventResponse> responses = new ArrayList<LocationUpdatedEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            LocationUpdatedEventResponse typedResponse = new LocationUpdatedEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.id = (BigInteger) eventValues.getIndexedValues().get(0).getValue();
            typedResponse.loc = (String) eventValues.getNonIndexedValues().get(0).getValue();
            responses.add(typedResponse);
        }
        return responses;
    }

    public List<ShippedEventResponse> getShippedEvents(TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = extractEventParametersWithLog(SHIPPED_EVENT, transactionReceipt);
        ArrayList<ShippedEventResponse> responses = new ArrayList<ShippedEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            ShippedEventResponse typedResponse = new ShippedEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.id = (BigInteger) eventValues.getIndexedValues().get(0).getValue();
            typedResponse.logistics = (String) eventValues.getNonIndexedValues().get(0).getValue();
            responses.add(typedResponse);
        }
        return responses;
    }

    public String auth() throws ContractException {
        final Function function = new Function(FUNC_AUTH, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Address>() {}));
        return executeCallWithSingleValueReturn(function, String.class);
    }

    public void auth(CallCallback callback) throws ContractException {
        final Function function = new Function(FUNC_AUTH, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Address>() {}));
        asyncExecuteCall(function, callback);
    }

    public TransactionReceipt deliver(BigInteger _id) {
        final Function function = new Function(
                FUNC_DELIVER, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return executeTransaction(function);
    }

    public String getSignedTransactionForDeliver(BigInteger _id) {
        final Function function = new Function(
                FUNC_DELIVER, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return createSignedTransaction(function);
    }

    public String deliver(BigInteger _id, TransactionCallback callback) {
        final Function function = new Function(
                FUNC_DELIVER, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return asyncExecuteTransaction(function, callback);
    }

    public Tuple1<BigInteger> getDeliverInput(TransactionReceipt transactionReceipt) {
        String data = transactionReceipt.getInput().substring(10);
        final Function function = new Function(FUNC_DELIVER, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        List<Type> results = this.functionReturnDecoder.decode(data, function.getOutputParameters());
        return new Tuple1<BigInteger>(

                (BigInteger) results.get(0).getValue()
                );
    }

    public Tuple5<String, String, String, BigInteger, BigInteger> logistics(BigInteger param0)
            throws ContractException {
        final Function function = new Function(FUNC_LOGISTICS, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(param0)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Address>() {}, new TypeReference<Utf8String>() {}, new TypeReference<Utf8String>() {}, new TypeReference<Uint256>() {}, new TypeReference<Uint256>() {}));
        List<Type> results = executeCallWithMultipleValueReturn(function);
        return new Tuple5<String, String, String, BigInteger, BigInteger>(
                (String) results.get(0).getValue(), 
                (String) results.get(1).getValue(), 
                (String) results.get(2).getValue(), 
                (BigInteger) results.get(3).getValue(), 
                (BigInteger) results.get(4).getValue());
    }

    public void logistics(BigInteger param0, CallCallback callback) throws ContractException {
        final Function function = new Function(FUNC_LOGISTICS, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(param0)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Address>() {}, new TypeReference<Utf8String>() {}, new TypeReference<Utf8String>() {}, new TypeReference<Uint256>() {}, new TypeReference<Uint256>() {}));
        asyncExecuteCall(function, callback);
    }

    public String orderCore() throws ContractException {
        final Function function = new Function(FUNC_ORDERCORE, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Address>() {}));
        return executeCallWithSingleValueReturn(function, String.class);
    }

    public void orderCore(CallCallback callback) throws ContractException {
        final Function function = new Function(FUNC_ORDERCORE, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Address>() {}));
        asyncExecuteCall(function, callback);
    }

    public TransactionReceipt ship(BigInteger _id, String _co, String _lg) {
        final Function function = new Function(
                FUNC_SHIP, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Utf8String(_co), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_lg)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return executeTransaction(function);
    }

    public String getSignedTransactionForShip(BigInteger _id, String _co, String _lg) {
        final Function function = new Function(
                FUNC_SHIP, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Utf8String(_co), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_lg)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return createSignedTransaction(function);
    }

    public String ship(BigInteger _id, String _co, String _lg, TransactionCallback callback) {
        final Function function = new Function(
                FUNC_SHIP, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Utf8String(_co), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_lg)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return asyncExecuteTransaction(function, callback);
    }

    public Tuple3<BigInteger, String, String> getShipInput(TransactionReceipt transactionReceipt) {
        String data = transactionReceipt.getInput().substring(10);
        final Function function = new Function(FUNC_SHIP, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}, new TypeReference<Utf8String>() {}, new TypeReference<Address>() {}));
        List<Type> results = this.functionReturnDecoder.decode(data, function.getOutputParameters());
        return new Tuple3<BigInteger, String, String>(

                (BigInteger) results.get(0).getValue(), 
                (String) results.get(1).getValue(), 
                (String) results.get(2).getValue()
                );
    }

    public TransactionReceipt updateLoc(BigInteger _id, String _loc) {
        final Function function = new Function(
                FUNC_UPDATELOC, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Utf8String(_loc)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return executeTransaction(function);
    }

    public String getSignedTransactionForUpdateLoc(BigInteger _id, String _loc) {
        final Function function = new Function(
                FUNC_UPDATELOC, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Utf8String(_loc)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return createSignedTransaction(function);
    }

    public String updateLoc(BigInteger _id, String _loc, TransactionCallback callback) {
        final Function function = new Function(
                FUNC_UPDATELOC, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Utf8String(_loc)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return asyncExecuteTransaction(function, callback);
    }

    public Tuple2<BigInteger, String> getUpdateLocInput(TransactionReceipt transactionReceipt) {
        String data = transactionReceipt.getInput().substring(10);
        final Function function = new Function(FUNC_UPDATELOC, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}, new TypeReference<Utf8String>() {}));
        List<Type> results = this.functionReturnDecoder.decode(data, function.getOutputParameters());
        return new Tuple2<BigInteger, String>(

                (BigInteger) results.get(0).getValue(), 
                (String) results.get(1).getValue()
                );
    }

    public static OrderLogistics load(String contractAddress, Client client,
            CryptoKeyPair credential) {
        return new OrderLogistics(contractAddress, client, credential);
    }

    public static OrderLogistics deploy(Client client, CryptoKeyPair credential, String _auth,
            String _orderCore) throws ContractException {
        byte[] encodedConstructor = FunctionEncoder.encodeConstructor(Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_auth), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_orderCore)));
        return deploy(OrderLogistics.class, client, credential, getBinary(client.getCryptoSuite()), getABI(), encodedConstructor, null);
    }

    public static class DeliveredEventResponse {
        public TransactionReceipt.Logs log;

        public BigInteger id;
    }

    public static class LocationUpdatedEventResponse {
        public TransactionReceipt.Logs log;

        public BigInteger id;

        public String loc;
    }

    public static class ShippedEventResponse {
        public TransactionReceipt.Logs log;

        public BigInteger id;

        public String logistics;
    }
}
