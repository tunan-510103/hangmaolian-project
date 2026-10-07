package com.trade.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.trade.entity.system.SysUser;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface SysUserMapper extends BaseMapper<SysUser> {
}