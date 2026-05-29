type TickerDirection = 'up' | 'down';

interface NewsItem {
  id: string;
  title: string;
  linkUrl: string;
  source: string;
}

interface ThreatTickerPanelProps {
  direction?: TickerDirection;
}

const NEWS_ITEMS: NewsItem[] = [
  {
    id: 'wechat-1',
    title: '13万条奔驰英国车主数据被黑客出售，个人隐私与车辆信息或遭泄露',
    linkUrl: 'https://mp.weixin.qq.com/s/vtx5RH-_PbEmfiWN4vCFCQ',
    source: '微信公众号',
  },
  {
    id: 'wechat-2',
    title: '特朗普家族旗下手机品牌数据泄露，近万名预购用户信息被公开',
    linkUrl: 'https://mp.weixin.qq.com/s/kuRHCTKQkdyaqvOJXhzrEg',
    source: '微信公众号',
  },
  {
    id: 'wechat-3',
    title: '多起高危投毒事件连环爆发！AI开发生态正沦为供应链攻击新入口',
    linkUrl: 'https://mp.weixin.qq.com/s/zojFIDb7Po33_unFWBKkyQ',
    source: '微信公众号',
  },
  {
    id: 'wechat-4',
    title: '1小时投毒639个恶意版本！开源供应链攻击再度爆发',
    linkUrl: 'https://mp.weixin.qq.com/s/luwibRXde9E9Kens00mqTA',
    source: '微信公众号',
  },
  {
    id: 'wechat-5',
    title: '时装品牌Zara近20万用户信息遭泄露，9500万条真实订单与售后记录被公开',
    linkUrl: 'https://mp.weixin.qq.com/s/WBkCiVY04kJi-EnpG8NHdA',
    source: '微信公众号',
  },
  {
    id: 'wechat-6',
    title: '勒索攻击从入侵到全线感染最快仅需51秒！单次事件平均损失243万美元',
    linkUrl: 'https://mp.weixin.qq.com/s/X1qjFFEBzjHD_wxqHOEYeA',
    source: '微信公众号',
  },
];

export function ThreatTickerPanel(props: ThreatTickerPanelProps) {
  const { direction = 'down' } = props;

  return (
    <section className="ticker-panel">
      <header className="ticker-panel-header">
        <div>
          <span className="ticker-panel-title">新闻事件板</span>
          <span className="ticker-panel-subtitle">公众号文章</span>
        </div>
      </header>

      <div className="ticker-panel-body">
        <div className={`ticker-column${direction === 'down' ? ' ticker-column--down' : ''}`}>
          {[0, 1].map((copyIndex) => (
            <div
              key={copyIndex}
              className="ticker-column-segment"
              aria-hidden={copyIndex === 1}
            >
              {NEWS_ITEMS.map((item) => (
                <a
                  key={`${copyIndex}-${item.id}`}
                  className="ticker-item"
                  href={item.linkUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  title={item.title}
                >
                  <span className="ticker-item-pill ticker-item-pill--warning">NEWS</span>
                  <span className="ticker-item-text">{item.title}</span>
                  <span className="ticker-item-time">{item.source}</span>
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
