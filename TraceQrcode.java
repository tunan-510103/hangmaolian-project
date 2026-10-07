package com.trade.entity.trace;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("t_trace_qrcode")
public class TraceQrcode {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Integer bizType;
    private Long bizId;
    private String qrcodeUrl;
    private String qrcodeImgPath;
    private LocalDateTime createTime;
}
