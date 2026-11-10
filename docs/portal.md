# 页面与故障控制

本服务只监听回环地址。POST /session 创建本地测试会话，cookie 为 HttpOnly；没有有效会话时，业务页面回到本地登录。此会话不对应真实居民账户。

/lookup 提供居民编号查询，结果每页一条，有总数及下一页链接。账号记录包含稳定的 data-account-ref 与 data-resident-ref。/confirm 展示账号、动作和 data-confirmation-token；令牌绑定当前会话和账号，只在明确刷新或会话过期时失效，重新打开同一页面不会自动换新。页面额外展示的联系方式为合成标记。

/close 处理普通浏览器表单。处置编号唯一：同一编号相同账号和动作再次提交返回原回执，身份不相符返回 409。/receipts?caseId=编号 显示正式回执；页面暂无回执不能代表处置未被受理。账本保存在服务端，客户端与门户是不同故障边界。

POST /__control/state 接受 JSON，支持 layout 为 table 或 cards、ready、duplicate、extraFields、accountOverride、dropAfterCommit、hideReceipts。ready=false 时查询页面等待，设置为 true 后可继续载入。duplicate 在另一个分页重复账号；extraFields 增加补充资料要求；accountOverride 可使结果与预期账号不一致。dropAfterCommit 仅让下一次有效处置落账后断开响应；hideReceipts 可以将已受理回执暂时从查询页隐藏，关闭后恢复可见。

POST /__control/rotate 清空已有令牌。POST /__control/expire 清除所有测试会话和令牌。GET /__control/ledger 返回门户实际回执与每次提交尝试的处置编号、账号和动作。控制接口服务于本地联调，业务自动操作应走普通页面；核对程序可以读取控制账本验证门户侧结果。
