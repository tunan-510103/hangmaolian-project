package com.trade.common;

import com.baomidou.mybatisplus.core.metadata.IPage;
import lombok.Data;
import java.util.List;

@Data
public class PageResult<T> {
    private List<T> list;
    private Long total;
    private Long pages;
    private Long page;
    private Long size;

    public static <T> PageResult<T> of(IPage<T> page) {
        PageResult<T> r = new PageResult<>();
        r.list = page.getRecords();
        r.total = page.getTotal();
        r.pages = page.getPages();
        r.page = page.getCurrent();
        r.size = page.getSize();
        return r;
    }
}
