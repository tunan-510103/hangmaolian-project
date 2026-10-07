package com.trade.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.trade.entity.tax.TaxMessage;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface TaxMessageMapper extends BaseMapper<TaxMessage> {
}