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
import org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint8;
import org.fisco.bcos.sdk.v3.codec.datatypes.generated.tuples.generated.Tuple1;
import org.fisco.bcos.sdk.v3.codec.datatypes.generated.tuples.generated.Tuple10;
import org.fisco.bcos.sdk.v3.codec.datatypes.generated.tuples.generated.Tuple2;
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
public class OrderCore extends Contract {
    public static final String[] BINARY_ARRAY = {"60806040523480156200001157600080fd5b5060405162001f4838038062001f488339818101604052810190620000379190620000e8565b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550506200011a565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000620000b08262000083565b9050919050565b620000c281620000a3565b8114620000ce57600080fd5b50565b600081519050620000e281620000b7565b92915050565b6000602082840312156200010157620001006200007e565b5b60006200011184828501620000d1565b91505092915050565b611e1e806200012a6000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c8063ce0f254011610071578063ce0f2540146101a8578063d6d595aa146101c6578063d7a4400e146101e2578063d896dd64146101fe578063de9375f21461021a578063fa14a8ec14610238576100b4565b806318e493de146100b95780631a4cfc33146100d55780632453ffa814610105578063347dd4f01461012357806345fa8aae1461013f578063a85c38ef1461016f575b600080fd5b6100d360048036038101906100ce9190611333565b610254565b005b6100ef60048036038101906100ea919061138f565b6104dd565b6040516100fc91906113fd565b60405180910390f35b61010d61051d565b60405161011a9190611427565b60405180910390f35b61013d6004803603810190610138919061138f565b610523565b005b6101596004803603810190610154919061138f565b61072a565b604051610166919061145e565b60405180910390f35b6101896004803603810190610184919061138f565b610757565b60405161019f9a99989796959493929190611501565b60405180910390f35b6101b0610928565b6040516101bd91906113fd565b60405180910390f35b6101e060048036038101906101db91906115d7565b61094e565b005b6101fc60048036038101906101f7919061168a565b610da9565b005b610218600480360381019061021391906116e3565b610e7e565b005b610222610f9a565b60405161022f9190611782565b60405180910390f35b610252600480360381019061024d919061179d565b610fbe565b005b600060026000848152602001908152602001600020905060008160000154116102b2576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016102a990611829565b60405180910390fd5b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663bca4bd50336040518263ffffffff1660e01b815260040161030b91906113fd565b602060405180830381865afa158015610328573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061034c9190611881565b61038b576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610382906118fa565b60405180910390fd5b3373ffffffffffffffffffffffffffffffffffffffff168160020160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff161461041d576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161041490611966565b60405180910390fd5b60008160030160149054906101000a900460ff1660ff1614610474576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161046b906119d2565b60405180910390fd5b60038160030160146101000a81548160ff021916908360ff160217905550818160070190805190602001906104aa929190611100565b50827f7876f1e607f2452cadac90d95d39ed99f0f7e95752d972a7a09933fb3db13f5e60405160405180910390a2505050565b60006002600083815260200190815260200160002060020160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050919050565b60035481565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166324d7806c336040518263ffffffff1660e01b815260040161057c91906113fd565b602060405180830381865afa158015610599573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906105bd9190611881565b6105fc576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016105f390611a3e565b60405180910390fd5b6000600260008381526020019081526020016000206000015411610655576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161064c90611aaa565b60405180910390fd5b600280600083815260200190815260200160002060030160149054906101000a900460ff1660ff16146106bd576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016106b490611b16565b60405180910390fd5b60046002600083815260200190815260200160002060030160146101000a81548160ff021916908360ff160217905550807f3907a03724ee8cd0199d40ffeb51ff5328da20bdd910dbdd5c0e5d412177ea6f334260405161071f929190611b36565b60405180910390a250565b60006002600083815260200190815260200160002060030160149054906101000a900460ff169050919050565b60026020528060005260406000206000915090508060000154908060010160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff16908060020160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff16908060030160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff16908060030160149054906101000a900460ff169080600401805461080590611b8e565b80601f016020809104026020016040519081016040528092919081815260200182805461083190611b8e565b801561087e5780601f106108535761010080835404028352916020019161087e565b820191906000526020600020905b81548152906001019060200180831161086157829003601f168201915b50505050509080600501549080600601549080600701805461089f90611b8e565b80601f01602080910402602001604051908101604052809291908181526020018280546108cb90611b8e565b80156109185780601f106108ed57610100808354040283529160200191610918565b820191906000526020600020905b8154815290600101906020018083116108fb57829003601f168201915b505050505090806008015490508a565b600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16634039ad0d336040518263ffffffff1660e01b81526004016109a791906113fd565b602060405180830381865afa1580156109c4573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906109e89190611881565b610a27576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610a1e90611c0c565b60405180910390fd5b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663bca4bd50866040518263ffffffff1660e01b8152600401610a8091906113fd565b602060405180830381865afa158015610a9d573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610ac19190611881565b610b00576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610af7906118fa565b60405180910390fd5b600083118015610b105750600082115b610b4f576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610b4690611c78565b60405180910390fd5b60036000815480929190610b6290611cc7565b919050555060405180610140016040528060035481526020013373ffffffffffffffffffffffffffffffffffffffff1681526020018673ffffffffffffffffffffffffffffffffffffffff168152602001600073ffffffffffffffffffffffffffffffffffffffff168152602001600060ff168152602001858152602001848152602001838152602001828152602001428152506002600060035481526020019081526020016000206000820151816000015560208201518160010160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555060408201518160020160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555060608201518160030160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555060808201518160030160146101000a81548160ff021916908360ff16021790555060a0820151816004019080519060200190610d27929190611100565b5060c0820151816005015560e08201518160060155610100820151816007019080519060200190610d59929190611100565b5061012082015181600801559050506003547f4ceaea0569072c9203c8c195ffccdbca9851b9d0410f577878a6792f12ec9b5233604051610d9a91906113fd565b60405180910390a25050505050565b600073ffffffffffffffffffffffffffffffffffffffff16600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1614610e3a576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610e3190611d5c565b60405180910390fd5b80600160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555050565b600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614610f0e576040","517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610f0590611dc8565b60405180910390fd5b6000600260008481526020019081526020016000206000015411610f67576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610f5e90611aaa565b60405180910390fd5b806002600084815260200190815260200160002060030160146101000a81548160ff021916908360ff1602179055505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461104e576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161104590611dc8565b60405180910390fd5b60006002600084815260200190815260200160002060000154116110a7576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161109e90611aaa565b60405180910390fd5b806002600084815260200190815260200160002060030160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505050565b82805461110c90611b8e565b90600052602060002090601f01602090048101928261112e5760008555611175565b82601f1061114757805160ff1916838001178555611175565b82800160010185558215611175579182015b82811115611174578251825591602001919060010190611159565b5b5090506111829190611186565b5090565b5b8082111561119f576000816000905550600101611187565b5090565b6000604051905090565b600080fd5b600080fd5b6000819050919050565b6111ca816111b7565b81146111d557600080fd5b50565b6000813590506111e7816111c1565b92915050565b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b611240826111f7565b810181811067ffffffffffffffff8211171561125f5761125e611208565b5b80604052505050565b60006112726111a3565b905061127e8282611237565b919050565b600067ffffffffffffffff82111561129e5761129d611208565b5b6112a7826111f7565b9050602081019050919050565b82818337600083830152505050565b60006112d66112d184611283565b611268565b9050828152602081018484840111156112f2576112f16111f2565b5b6112fd8482856112b4565b509392505050565b600082601f83011261131a576113196111ed565b5b813561132a8482602086016112c3565b91505092915050565b6000806040838503121561134a576113496111ad565b5b6000611358858286016111d8565b925050602083013567ffffffffffffffff811115611379576113786111b2565b5b61138585828601611305565b9150509250929050565b6000602082840312156113a5576113a46111ad565b5b60006113b3848285016111d8565b91505092915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006113e7826113bc565b9050919050565b6113f7816113dc565b82525050565b600060208201905061141260008301846113ee565b92915050565b611421816111b7565b82525050565b600060208201905061143c6000830184611418565b92915050565b600060ff82169050919050565b61145881611442565b82525050565b6000602082019050611473600083018461144f565b92915050565b600081519050919050565b600082825260208201905092915050565b60005b838110156114b3578082015181840152602081019050611498565b838111156114c2576000848401525b50505050565b60006114d382611479565b6114dd8185611484565b93506114ed818560208601611495565b6114f6816111f7565b840191505092915050565b600061014082019050611517600083018d611418565b611524602083018c6113ee565b611531604083018b6113ee565b61153e606083018a6113ee565b61154b608083018961144f565b81810360a083015261155d81886114c8565b905061156c60c0830187611418565b61157960e0830186611418565b81810361010083015261158c81856114c8565b905061159c610120830184611418565b9b9a5050505050505050505050565b6115b4816113dc565b81146115bf57600080fd5b50565b6000813590506115d1816115ab565b92915050565b600080600080600060a086880312156115f3576115f26111ad565b5b6000611601888289016115c2565b955050602086013567ffffffffffffffff811115611622576116216111b2565b5b61162e88828901611305565b945050604061163f888289016111d8565b9350506060611650888289016111d8565b925050608086013567ffffffffffffffff811115611671576116706111b2565b5b61167d88828901611305565b9150509295509295909350565b6000602082840312156116a05761169f6111ad565b5b60006116ae848285016115c2565b91505092915050565b6116c081611442565b81146116cb57600080fd5b50565b6000813590506116dd816116b7565b92915050565b600080604083850312156116fa576116f96111ad565b5b6000611708858286016111d8565b9250506020611719858286016116ce565b9150509250929050565b6000819050919050565b600061174861174361173e846113bc565b611723565b6113bc565b9050919050565b600061175a8261172d565b9050919050565b600061176c8261174f565b9050919050565b61177c81611761565b82525050565b60006020820190506117976000830184611773565b92915050565b600080604083850312156117b4576117b36111ad565b5b60006117c2858286016111d8565b92505060206117d3858286016115c2565b9150509250929050565b7f4e6f742065786973740000000000000000000000000000000000000000000000600082015250565b6000611813600983611484565b915061181e826117dd565b602082019050919050565b6000602082019050818103600083015261184281611806565b9050919050565b60008115159050919050565b61185e81611849565b811461186957600080fd5b50565b60008151905061187b81611855565b92915050565b600060208284031215611897576118966111ad565b5b60006118a58482850161186c565b91505092915050565b7f4e6f742057617265686f75736500000000000000000000000000000000000000600082015250565b60006118e4600d83611484565b91506118ef826118ae565b602082019050919050565b60006020820190508181036000830152611913816118d7565b9050919050565b7f4e6f7420796f7572730000000000000000000000000000000000000000000000600082015250565b6000611950600983611484565b915061195b8261191a565b602082019050919050565b6000602082019050818103600083015261197f81611943565b9050919050565b7f57726f6e67207374617475730000000000000000000000000000000000000000600082015250565b60006119bc600c83611484565b91506119c782611986565b602082019050919050565b600060208201905081810360008301526119eb816119af565b9050919050565b7f4f6e6c792041646d696e00000000000000000000000000000000000000000000600082015250565b6000611a28600a83611484565b9150611a33826119f2565b602082019050919050565b60006020820190508181036000830152611a5781611a1b565b9050919050565b7f4f72646572206e6f742065786973740000000000000000000000000000000000600082015250565b6000611a94600f83611484565b9150611a9f82611a5e565b602082019050919050565b60006020820190508181036000830152611ac381611a87565b9050919050565b7f4f72646572206e6f742064656c69766572656400000000000000000000000000600082015250565b6000611b00601383611484565b9150611b0b82611aca565b602082019050919050565b60006020820190508181036000830152611b2f81611af3565b9050919050565b6000604082019050611b4b60008301856113ee565b611b586020830184611418565b9392505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b60006002820490506001821680611ba657607f821691505b60208210811415611bba57611bb9611b5f565b5b50919050565b7f4e6f742054726164657200000000000000000000000000000000000000000000600082015250565b6000611bf6600a83611484565b9150611c0182611bc0565b602082019050919050565b60006020820190508181036000830152611c2581611be9565b9050919050565b7f496e76616c696400000000000000000000000000000000000000000000000000600082015250565b6000611c62600783611484565b9150611c6d82611c2c565b602082019050919050565b60006020820190508181036000830152611c9181611c55565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b6000611cd2826111b7565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff821415611d0557611d04611c98565b5b600182019050919050565b7f416c726561647920736574000000000000000000000000000000000000000000600082015250565b6000611d46600b83611484565b9150611d5182611d10565b602082019050919050565b60006020820190508181036000830152611d7581611d39565b9050919050565b7f4f6e6c79204f726465724c6f6769737469637300000000000000000000000000600082015250565b6000611db2601383611484565b9150611dbd82611d7c565b602082019050919050565b60006020820190508181036000830152611de181611da5565b905091905056fea2646970667358221220c77049eda8269cc5fa73153aec919d27c37071f95097e072f5f79100dfc007e464736f6c634300080b0033"};

    public static final String BINARY = org.fisco.bcos.sdk.v3.utils.StringUtils.joinAll("", BINARY_ARRAY);

    public static final String[] SM_BINARY_ARRAY = {};

    public static final String SM_BINARY = org.fisco.bcos.sdk.v3.utils.StringUtils.joinAll("", SM_BINARY_ARRAY);

    public static final String[] ABI_ARRAY = {"[{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_auth\",\"type\":\"address\"}],\"stateMutability\":\"nonpayable\",\"type\":\"constructor\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"trader\",\"type\":\"address\"}],\"name\":\"OrderCreated\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"verifier\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"uint256\",\"name\":\"time\",\"type\":\"uint256\"}],\"name\":\"OrderVerified\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"}],\"name\":\"Warehoused\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"auth\",\"outputs\":[{\"internalType\":\"contract IAuth\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_wh\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"_goods\",\"type\":\"string\"},{\"internalType\":\"uint256\",\"name\":\"_qty\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"_price\",\"type\":\"uint256\"},{\"internalType\":\"string\",\"name\":\"_hash\",\"type\":\"string\"}],\"name\":\"createOrder\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"_id\",\"type\":\"uint256\"}],\"name\":\"getOrderStatus\",\"outputs\":[{\"internalType\":\"uint8\",\"name\":\"\",\"type\":\"uint8\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"_id\",\"type\":\"uint256\"}],\"name\":\"getOrderWarehouse\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"orderCount\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"orderLogistics\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"name\":\"orders\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"trader\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"warehouse\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"logistics\",\"type\":\"address\"},{\"internalType\":\"uint8\",\"name\":\"status\",\"type\":\"uint8\"},{\"internalType\":\"string\",\"name\":\"goodsName\",\"type\":\"string\"},{\"internalType\":\"uint256\",\"name\":\"quantity\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"price\",\"type\":\"uint256\"},{\"internalType\":\"string\",\"name\":\"hash\",\"type\":\"string\"},{\"internalType\":\"uint256\",\"name\":\"createTime\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"_id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"_logistics\",\"type\":\"address\"}],\"name\":\"setLogistics\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_addr\",\"type\":\"address\"}],\"name\":\"setOrderLogistics\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"_id\",\"type\":\"uint256\"},{\"internalType\":\"uint8\",\"name\":\"_status\",\"type\":\"uint8\"}],\"name\":\"setStatus\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"_id\",\"type\":\"uint256\"}],\"name\":\"verifyOrder\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"_id\",\"type\":\"uint256\"},{\"internalType\":\"string\",\"name\":\"_hash\",\"type\":\"string\"}],\"name\":\"warehousing\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]"};

    public static final String ABI = org.fisco.bcos.sdk.v3.utils.StringUtils.joinAll("", ABI_ARRAY);

    public static final String FUNC_AUTH = "auth";

    public static final String FUNC_CREATEORDER = "createOrder";

    public static final String FUNC_GETORDERSTATUS = "getOrderStatus";

    public static final String FUNC_GETORDERWAREHOUSE = "getOrderWarehouse";

    public static final String FUNC_ORDERCOUNT = "orderCount";

    public static final String FUNC_ORDERLOGISTICS = "orderLogistics";

    public static final String FUNC_ORDERS = "orders";

    public static final String FUNC_SETLOGISTICS = "setLogistics";

    public static final String FUNC_SETORDERLOGISTICS = "setOrderLogistics";

    public static final String FUNC_SETSTATUS = "setStatus";

    public static final String FUNC_VERIFYORDER = "verifyOrder";

    public static final String FUNC_WAREHOUSING = "warehousing";

    public static final Event ORDERCREATED_EVENT = new Event("OrderCreated", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>(true) {}, new TypeReference<Address>() {}));
    ;

    public static final Event ORDERVERIFIED_EVENT = new Event("OrderVerified", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>(true) {}, new TypeReference<Address>() {}, new TypeReference<Uint256>() {}));
    ;

    public static final Event WAREHOUSED_EVENT = new Event("Warehoused", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>(true) {}));
    ;

    protected OrderCore(String contractAddress, Client client, CryptoKeyPair credential) {
        super(getBinary(client.getCryptoSuite()), contractAddress, client, credential);
    }

    public static String getBinary(CryptoSuite cryptoSuite) {
        return (cryptoSuite.getCryptoTypeConfig() == CryptoType.ECDSA_TYPE ? BINARY : SM_BINARY);
    }

    public static String getABI() {
        return ABI;
    }

    public List<OrderCreatedEventResponse> getOrderCreatedEvents(
            TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = extractEventParametersWithLog(ORDERCREATED_EVENT, transactionReceipt);
        ArrayList<OrderCreatedEventResponse> responses = new ArrayList<OrderCreatedEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            OrderCreatedEventResponse typedResponse = new OrderCreatedEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.id = (BigInteger) eventValues.getIndexedValues().get(0).getValue();
            typedResponse.trader = (String) eventValues.getNonIndexedValues().get(0).getValue();
            responses.add(typedResponse);
        }
        return responses;
    }

    public List<OrderVerifiedEventResponse> getOrderVerifiedEvents(
            TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = extractEventParametersWithLog(ORDERVERIFIED_EVENT, transactionReceipt);
        ArrayList<OrderVerifiedEventResponse> responses = new ArrayList<OrderVerifiedEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            OrderVerifiedEventResponse typedResponse = new OrderVerifiedEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.id = (BigInteger) eventValues.getIndexedValues().get(0).getValue();
            typedResponse.verifier = (String) eventValues.getNonIndexedValues().get(0).getValue();
            typedResponse.time = (BigInteger) eventValues.getNonIndexedValues().get(1).getValue();
            responses.add(typedResponse);
        }
        return responses;
    }

    public List<WarehousedEventResponse> getWarehousedEvents(
            TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = extractEventParametersWithLog(WAREHOUSED_EVENT, transactionReceipt);
        ArrayList<WarehousedEventResponse> responses = new ArrayList<WarehousedEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            WarehousedEventResponse typedResponse = new WarehousedEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.id = (BigInteger) eventValues.getIndexedValues().get(0).getValue();
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

    public TransactionReceipt createOrder(String _wh, String _goods, BigInteger _qty,
            BigInteger _price, String _hash) {
        final Function function = new Function(
                FUNC_CREATEORDER, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_wh), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Utf8String(_goods), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_qty), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_price), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Utf8String(_hash)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return executeTransaction(function);
    }

    public String getSignedTransactionForCreateOrder(String _wh, String _goods, BigInteger _qty,
            BigInteger _price, String _hash) {
        final Function function = new Function(
                FUNC_CREATEORDER, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_wh), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Utf8String(_goods), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_qty), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_price), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Utf8String(_hash)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return createSignedTransaction(function);
    }

    public String createOrder(String _wh, String _goods, BigInteger _qty, BigInteger _price,
            String _hash, TransactionCallback callback) {
        final Function function = new Function(
                FUNC_CREATEORDER, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_wh), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Utf8String(_goods), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_qty), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_price), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Utf8String(_hash)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return asyncExecuteTransaction(function, callback);
    }

    public Tuple5<String, String, BigInteger, BigInteger, String> getCreateOrderInput(
            TransactionReceipt transactionReceipt) {
        String data = transactionReceipt.getInput().substring(10);
        final Function function = new Function(FUNC_CREATEORDER, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Address>() {}, new TypeReference<Utf8String>() {}, new TypeReference<Uint256>() {}, new TypeReference<Uint256>() {}, new TypeReference<Utf8String>() {}));
        List<Type> results = this.functionReturnDecoder.decode(data, function.getOutputParameters());
        return new Tuple5<String, String, BigInteger, BigInteger, String>(

                (String) results.get(0).getValue(), 
                (String) results.get(1).getValue(), 
                (BigInteger) results.get(2).getValue(), 
                (BigInteger) results.get(3).getValue(), 
                (String) results.get(4).getValue()
                );
    }

    public BigInteger getOrderStatus(BigInteger _id) throws ContractException {
        final Function function = new Function(FUNC_GETORDERSTATUS, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint8>() {}));
        return executeCallWithSingleValueReturn(function, BigInteger.class);
    }

    public void getOrderStatus(BigInteger _id, CallCallback callback) throws ContractException {
        final Function function = new Function(FUNC_GETORDERSTATUS, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint8>() {}));
        asyncExecuteCall(function, callback);
    }

    public String getOrderWarehouse(BigInteger _id) throws ContractException {
        final Function function = new Function(FUNC_GETORDERWAREHOUSE, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Address>() {}));
        return executeCallWithSingleValueReturn(function, String.class);
    }

    public void getOrderWarehouse(BigInteger _id, CallCallback callback) throws ContractException {
        final Function function = new Function(FUNC_GETORDERWAREHOUSE, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Address>() {}));
        asyncExecuteCall(function, callback);
    }

    public BigInteger orderCount() throws ContractException {
        final Function function = new Function(FUNC_ORDERCOUNT, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeCallWithSingleValueReturn(function, BigInteger.class);
    }

    public void orderCount(CallCallback callback) throws ContractException {
        final Function function = new Function(FUNC_ORDERCOUNT, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        asyncExecuteCall(function, callback);
    }

    public String orderLogistics() throws ContractException {
        final Function function = new Function(FUNC_ORDERLOGISTICS, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Address>() {}));
        return executeCallWithSingleValueReturn(function, String.class);
    }

    public void orderLogistics(CallCallback callback) throws ContractException {
        final Function function = new Function(FUNC_ORDERLOGISTICS, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Address>() {}));
        asyncExecuteCall(function, callback);
    }

    public Tuple10<BigInteger, String, String, String, BigInteger, String, BigInteger, BigInteger, String, BigInteger> orders(
            BigInteger param0) throws ContractException {
        final Function function = new Function(FUNC_ORDERS, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(param0)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}, new TypeReference<Address>() {}, new TypeReference<Address>() {}, new TypeReference<Address>() {}, new TypeReference<Uint8>() {}, new TypeReference<Utf8String>() {}, new TypeReference<Uint256>() {}, new TypeReference<Uint256>() {}, new TypeReference<Utf8String>() {}, new TypeReference<Uint256>() {}));
        List<Type> results = executeCallWithMultipleValueReturn(function);
        return new Tuple10<BigInteger, String, String, String, BigInteger, String, BigInteger, BigInteger, String, BigInteger>(
                (BigInteger) results.get(0).getValue(), 
                (String) results.get(1).getValue(), 
                (String) results.get(2).getValue(), 
                (String) results.get(3).getValue(), 
                (BigInteger) results.get(4).getValue(), 
                (String) results.get(5).getValue(), 
                (BigInteger) results.get(6).getValue(), 
                (BigInteger) results.get(7).getValue(), 
                (String) results.get(8).getValue(), 
                (BigInteger) results.get(9).getValue());
    }

    public void orders(BigInteger param0, CallCallback callback) throws ContractException {
        final Function function = new Function(FUNC_ORDERS, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(param0)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}, new TypeReference<Address>() {}, new TypeReference<Address>() {}, new TypeReference<Address>() {}, new TypeReference<Uint8>() {}, new TypeReference<Utf8String>() {}, new TypeReference<Uint256>() {}, new TypeReference<Uint256>() {}, new TypeReference<Utf8String>() {}, new TypeReference<Uint256>() {}));
        asyncExecuteCall(function, callback);
    }

    public TransactionReceipt setLogistics(BigInteger _id, String _logistics) {
        final Function function = new Function(
                FUNC_SETLOGISTICS, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_logistics)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return executeTransaction(function);
    }

    public String getSignedTransactionForSetLogistics(BigInteger _id, String _logistics) {
        final Function function = new Function(
                FUNC_SETLOGISTICS, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_logistics)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return createSignedTransaction(function);
    }

    public String setLogistics(BigInteger _id, String _logistics, TransactionCallback callback) {
        final Function function = new Function(
                FUNC_SETLOGISTICS, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_logistics)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return asyncExecuteTransaction(function, callback);
    }

    public Tuple2<BigInteger, String> getSetLogisticsInput(TransactionReceipt transactionReceipt) {
        String data = transactionReceipt.getInput().substring(10);
        final Function function = new Function(FUNC_SETLOGISTICS, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}, new TypeReference<Address>() {}));
        List<Type> results = this.functionReturnDecoder.decode(data, function.getOutputParameters());
        return new Tuple2<BigInteger, String>(

                (BigInteger) results.get(0).getValue(), 
                (String) results.get(1).getValue()
                );
    }

    public TransactionReceipt setOrderLogistics(String _addr) {
        final Function function = new Function(
                FUNC_SETORDERLOGISTICS, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_addr)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return executeTransaction(function);
    }

    public String getSignedTransactionForSetOrderLogistics(String _addr) {
        final Function function = new Function(
                FUNC_SETORDERLOGISTICS, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_addr)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return createSignedTransaction(function);
    }

    public String setOrderLogistics(String _addr, TransactionCallback callback) {
        final Function function = new Function(
                FUNC_SETORDERLOGISTICS, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_addr)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return asyncExecuteTransaction(function, callback);
    }

    public Tuple1<String> getSetOrderLogisticsInput(TransactionReceipt transactionReceipt) {
        String data = transactionReceipt.getInput().substring(10);
        final Function function = new Function(FUNC_SETORDERLOGISTICS, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Address>() {}));
        List<Type> results = this.functionReturnDecoder.decode(data, function.getOutputParameters());
        return new Tuple1<String>(

                (String) results.get(0).getValue()
                );
    }

    public TransactionReceipt setStatus(BigInteger _id, BigInteger _status) {
        final Function function = new Function(
                FUNC_SETSTATUS, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint8(_status)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return executeTransaction(function);
    }

    public String getSignedTransactionForSetStatus(BigInteger _id, BigInteger _status) {
        final Function function = new Function(
                FUNC_SETSTATUS, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint8(_status)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return createSignedTransaction(function);
    }

    public String setStatus(BigInteger _id, BigInteger _status, TransactionCallback callback) {
        final Function function = new Function(
                FUNC_SETSTATUS, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint8(_status)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return asyncExecuteTransaction(function, callback);
    }

    public Tuple2<BigInteger, BigInteger> getSetStatusInput(TransactionReceipt transactionReceipt) {
        String data = transactionReceipt.getInput().substring(10);
        final Function function = new Function(FUNC_SETSTATUS, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}, new TypeReference<Uint8>() {}));
        List<Type> results = this.functionReturnDecoder.decode(data, function.getOutputParameters());
        return new Tuple2<BigInteger, BigInteger>(

                (BigInteger) results.get(0).getValue(), 
                (BigInteger) results.get(1).getValue()
                );
    }

    public TransactionReceipt verifyOrder(BigInteger _id) {
        final Function function = new Function(
                FUNC_VERIFYORDER, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return executeTransaction(function);
    }

    public String getSignedTransactionForVerifyOrder(BigInteger _id) {
        final Function function = new Function(
                FUNC_VERIFYORDER, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return createSignedTransaction(function);
    }

    public String verifyOrder(BigInteger _id, TransactionCallback callback) {
        final Function function = new Function(
                FUNC_VERIFYORDER, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return asyncExecuteTransaction(function, callback);
    }

    public Tuple1<BigInteger> getVerifyOrderInput(TransactionReceipt transactionReceipt) {
        String data = transactionReceipt.getInput().substring(10);
        final Function function = new Function(FUNC_VERIFYORDER, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        List<Type> results = this.functionReturnDecoder.decode(data, function.getOutputParameters());
        return new Tuple1<BigInteger>(

                (BigInteger) results.get(0).getValue()
                );
    }

    public TransactionReceipt warehousing(BigInteger _id, String _hash) {
        final Function function = new Function(
                FUNC_WAREHOUSING, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Utf8String(_hash)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return executeTransaction(function);
    }

    public String getSignedTransactionForWarehousing(BigInteger _id, String _hash) {
        final Function function = new Function(
                FUNC_WAREHOUSING, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Utf8String(_hash)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return createSignedTransaction(function);
    }

    public String warehousing(BigInteger _id, String _hash, TransactionCallback callback) {
        final Function function = new Function(
                FUNC_WAREHOUSING, 
                Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.generated.Uint256(_id), 
                new org.fisco.bcos.sdk.v3.codec.datatypes.Utf8String(_hash)), 
                Collections.<TypeReference<?>>emptyList(), 0);
        return asyncExecuteTransaction(function, callback);
    }

    public Tuple2<BigInteger, String> getWarehousingInput(TransactionReceipt transactionReceipt) {
        String data = transactionReceipt.getInput().substring(10);
        final Function function = new Function(FUNC_WAREHOUSING, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}, new TypeReference<Utf8String>() {}));
        List<Type> results = this.functionReturnDecoder.decode(data, function.getOutputParameters());
        return new Tuple2<BigInteger, String>(

                (BigInteger) results.get(0).getValue(), 
                (String) results.get(1).getValue()
                );
    }

    public static OrderCore load(String contractAddress, Client client, CryptoKeyPair credential) {
        return new OrderCore(contractAddress, client, credential);
    }

    public static OrderCore deploy(Client client, CryptoKeyPair credential, String _auth) throws
            ContractException {
        byte[] encodedConstructor = FunctionEncoder.encodeConstructor(Arrays.<Type>asList(new org.fisco.bcos.sdk.v3.codec.datatypes.Address(_auth)));
        return deploy(OrderCore.class, client, credential, getBinary(client.getCryptoSuite()), getABI(), encodedConstructor, null);
    }

    public static class OrderCreatedEventResponse {
        public TransactionReceipt.Logs log;

        public BigInteger id;

        public String trader;
    }

    public static class OrderVerifiedEventResponse {
        public TransactionReceipt.Logs log;

        public BigInteger id;

        public String verifier;

        public BigInteger time;
    }

    public static class WarehousedEventResponse {
        public TransactionReceipt.Logs log;

        public BigInteger id;
    }
}
