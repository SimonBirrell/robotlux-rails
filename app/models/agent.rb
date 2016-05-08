class Agent < ActiveRecord::Base

	belongs_to :org
	has_many :agent_sessions

	validates :slug, presence: true
	validates :org, presence: true
	validates_format_of :slug, :with => /\A[_a-z0-9]+\z/

	validates :slug, uniqueness: {scope: :org, message: 'agent slugs must be unique within org'}

	before_save :auto_generate_name


	def auto_generate_name
		self.name = slug.titleize
	end

end
